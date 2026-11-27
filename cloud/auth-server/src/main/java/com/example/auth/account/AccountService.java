package com.example.auth.account;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates accounts: self-registration, Google/Facebook sign-in and the seeded admin. */
@Service
@Transactional
public class AccountService {

	/** A sign-in or registration that must be refused, with a message for the user. */
	public static class AccountRejectedException extends RuntimeException {
		public AccountRejectedException(String message) {
			super(message);
		}
	}

	private final AccountRepository accounts;
	private final PasswordEncoder passwordEncoder;

	public AccountService(AccountRepository accounts, PasswordEncoder passwordEncoder) {
		this.accounts = accounts;
		this.passwordEncoder = passwordEncoder;
	}

	/** Self-registration always creates a customer (USER) account. */
	public Account register(String email, String password, String firstName, String lastName) {
		String normalized = normalize(email);
		if (accounts.existsByEmailIgnoreCase(normalized)) {
			throw new AccountRejectedException("This email is already registered");
		}
		Account account = new Account(normalized, Role.USER, AuthProvider.LOCAL, firstName.trim(), lastName.trim());
		account.setPasswordHash(passwordEncoder.encode(password));
		return accounts.save(account);
	}

	public Account createAdmin(String email, String password) {
		Account admin = new Account(normalize(email), Role.ADMIN, AuthProvider.LOCAL, "Store", "Administrator");
		admin.setPasswordHash(passwordEncoder.encode(password));
		return accounts.save(admin);
	}

	/**
	 * Finds or creates the customer account for a Google/Facebook sign-in. An email that already belongs to an
	 * account with a different sign-in method is refused rather than silently linked, so nobody can take over an
	 * account through a provider; admins (LOCAL accounts) therefore can never sign in this way.
	 */
	public Account upsertSocial(AuthProvider provider, String providerId, String email, String firstName,
			String lastName) {
		var linked = accounts.findByProviderAndProviderId(provider, providerId);
		if (linked.isPresent()) {
			return requireEnabled(linked.get());
		}
		String normalized = normalize(email);
		var sameEmail = accounts.findByEmailIgnoreCase(normalized);
		if (sameEmail.isPresent()) {
			Account existing = sameEmail.get();
			if (existing.getProvider() != provider) {
				throw new AccountRejectedException("This email is registered with %s sign-in"
						.formatted(existing.getProvider() == AuthProvider.LOCAL ? "email & password"
								: existing.getProvider().name().toLowerCase(Locale.ROOT)));
			}
			existing.setProviderId(providerId);
			return requireEnabled(existing);
		}
		Account account = new Account(normalized, Role.USER, provider, firstName, lastName);
		account.setProviderId(providerId);
		return accounts.save(account);
	}

	private static Account requireEnabled(Account account) {
		if (!account.isEnabled()) {
			throw new AccountRejectedException("This account is disabled");
		}
		return account;
	}

	private static String normalize(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}
}
