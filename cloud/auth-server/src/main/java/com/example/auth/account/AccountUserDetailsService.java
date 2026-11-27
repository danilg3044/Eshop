package com.example.auth.account;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Email + password sign-in: only LOCAL accounts have a password. The username is the email. */
@Service
public class AccountUserDetailsService implements UserDetailsService {

	private final AccountRepository accounts;

	public AccountUserDetailsService(AccountRepository accounts) {
		this.accounts = accounts;
	}

	@Override
	public UserDetails loadUserByUsername(String email) {
		Account account = accounts.findByEmailIgnoreCase(email.trim())
				.filter(a -> a.getProvider() == AuthProvider.LOCAL && a.getPasswordHash() != null)
				.orElseThrow(() -> new UsernameNotFoundException("No local account for " + email));
		return User.withUsername(account.getEmail())
				.password(account.getPasswordHash())
				.roles(account.getRole().name())
				.disabled(!account.isEnabled())
				.build();
	}
}
