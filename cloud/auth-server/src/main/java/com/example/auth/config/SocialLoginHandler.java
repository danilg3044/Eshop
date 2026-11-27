package com.example.auth.config;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Component;

import com.example.auth.account.AccountService;
import com.example.auth.account.AccountService.AccountRejectedException;
import com.example.auth.account.AuthProvider;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * After Google/Facebook sign-in: create or find the local account, then continue where the user was going
 * (normally the /oauth2/authorize request of the shop, which then issues the code). Refused sign-ins
 * (e.g. the email belongs to an email-and-password account) end the session and return to the login page.
 */
@Component
public class SocialLoginHandler extends SavedRequestAwareAuthenticationSuccessHandler
		implements AuthenticationFailureHandler {

	private final AccountService accounts;

	public SocialLoginHandler(AccountService accounts) {
		this.accounts = accounts;
	}

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) throws IOException, jakarta.servlet.ServletException {
		var token = (OAuth2AuthenticationToken) authentication;
		AuthProvider provider = AuthProvider.fromRegistrationId(token.getAuthorizedClientRegistrationId());
		OAuth2User user = token.getPrincipal();
		String email = user.getAttribute("email");
		try {
			if (email == null) {
				throw new AccountRejectedException("Your %s account has no email address".formatted(provider));
			}
			String[] names = names(user);
			accounts.upsertSocial(provider, token.getName(), email, names[0], names[1]);
		} catch (AccountRejectedException ex) {
			new SecurityContextLogoutHandler().logout(request, response, authentication);
			response.sendRedirect(loginWithError(request, ex.getMessage()));
			return;
		}
		super.onAuthenticationSuccess(request, response, authentication);
	}

	@Override
	public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException exception) throws IOException {
		response.sendRedirect(loginWithError(request, "Social sign-in failed"));
	}

	/** Google sends given_name/family_name; Facebook only "name". */
	private static String[] names(OAuth2User user) {
		String given = user.getAttribute("given_name");
		String family = user.getAttribute("family_name");
		if (given != null || family != null) {
			return new String[] { given, family };
		}
		String full = user.getAttribute("name");
		if (full == null || full.isBlank()) {
			return new String[] { null, null };
		}
		int space = full.trim().lastIndexOf(' ');
		return space < 0 ? new String[] { full.trim(), null }
				: new String[] { full.trim().substring(0, space), full.trim().substring(space + 1) };
	}

	private static String loginWithError(HttpServletRequest request, String message) {
		return request.getContextPath() + "/login?social_error=" + URLEncoder.encode(message, StandardCharsets.UTF_8);
	}
}
