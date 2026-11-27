package com.example.auth.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.stereotype.Component;

import com.example.auth.account.Account;
import com.example.auth.account.AccountRepository;
import com.example.auth.account.AuthProvider;

/**
 * Puts the account into every access token and ID token, so services need no call back to this server:
 * <ul>
 *   <li>{@code sub} = account id (stable, unlike email)</li>
 *   <li>{@code email}, {@code role} (USER | ADMIN), {@code provider} (LOCAL | GOOGLE | FACEBOOK)</li>
 *   <li>{@code given_name}, {@code family_name} (standard OIDC claims; the shop starts a new profile from them)</li>
 * </ul>
 * Client-credentials tokens (machine-to-machine, no user) are left as they are.
 */
@Component
public class AccountClaims implements OAuth2TokenCustomizer<JwtEncodingContext> {

	private final AccountRepository accounts;

	public AccountClaims(AccountRepository accounts) {
		this.accounts = accounts;
	}

	@Override
	public void customize(JwtEncodingContext context) {
		if (AuthorizationGrantType.CLIENT_CREDENTIALS.equals(context.getAuthorizationGrantType())) {
			return;
		}
		Account account = accountOf(context.getPrincipal());
		var claims = context.getClaims()
				.subject(String.valueOf(account.getId()))
				.claim("email", account.getEmail())
				.claim("role", account.getRole().name())
				.claim("provider", account.getProvider().name());
		if (account.getFirstName() != null) {
			claims.claim("given_name", account.getFirstName());
		}
		if (account.getLastName() != null) {
			claims.claim("family_name", account.getLastName());
		}
	}

	private Account accountOf(Authentication principal) {
		var account = principal instanceof OAuth2AuthenticationToken social
				? accounts.findByProviderAndProviderId(
						AuthProvider.fromRegistrationId(social.getAuthorizedClientRegistrationId()), social.getName())
				: accounts.findByEmailIgnoreCase(principal.getName());
		return account.orElseThrow(() -> new IllegalStateException("No account for " + principal.getName()));
	}
}
