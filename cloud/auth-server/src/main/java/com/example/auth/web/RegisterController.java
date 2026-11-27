package com.example.auth.web;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.FactorGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.stereotype.Controller;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import com.example.auth.account.Account;
import com.example.auth.account.AccountService;
import com.example.auth.account.AccountService.AccountRejectedException;
import com.example.auth.config.IdentityProperties;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/**
 * Customer self-registration. On success the new user is signed in right away and continues where they were
 * going: normally the shop's /oauth2/authorize request, so they land back in the shop with a token.
 */
@Controller
public class RegisterController {

	private final AccountService accounts;
	private final UserDetailsService userDetails;
	private final IdentityProperties props;
	private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
	private final RequestCache requestCache = new HttpSessionRequestCache();

	public RegisterController(AccountService accounts, UserDetailsService userDetails, IdentityProperties props) {
		this.accounts = accounts;
		this.userDetails = userDetails;
		this.props = props;
	}

	@GetMapping("/register")
	public String form(@ModelAttribute("form") RegistrationForm form) {
		return "register";
	}

	@PostMapping("/register")
	public String register(@Valid @ModelAttribute("form") RegistrationForm form, BindingResult errors,
			HttpServletRequest request, HttpServletResponse response) {
		if (errors.hasErrors()) {
			return "register";
		}
		Account account;
		try {
			account = accounts.register(form.getEmail(), form.getPassword(), form.getFirstName(), form.getLastName());
		} catch (AccountRejectedException ex) {
			errors.rejectValue("email", "taken", ex.getMessage());
			return "register";
		}
		signIn(account, request, response);
		SavedRequest saved = requestCache.getRequest(request, response);
		return "redirect:" + (saved != null ? saved.getRedirectUrl() : props.frontendUrl());
	}

	private void signIn(Account account, HttpServletRequest request, HttpServletResponse response) {
		UserDetails user = userDetails.loadUserByUsername(account.getEmail());
		// Like form login, record that the password factor was just used: Spring Security 7 takes the ID token's
		// auth_time from this authority.
		List<GrantedAuthority> authorities = new ArrayList<>(user.getAuthorities());
		authorities.add(FactorGrantedAuthority.withAuthority(FactorGrantedAuthority.PASSWORD_AUTHORITY)
				.issuedAt(Instant.now()).build());
		var context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, authorities));
		SecurityContextHolder.setContext(context);
		request.changeSessionId(); // new session id after sign-in (session fixation protection)
		contextRepository.saveContext(context, request, response);
	}
}
