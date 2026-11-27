package com.example.auth.account;

import java.util.Locale;

/** How an account signs in. Sent to the services as the "provider" claim. */
public enum AuthProvider {
	LOCAL, GOOGLE, FACEBOOK;

	/** Spring's OAuth2 registration id ("google", "facebook") -> provider. */
	public static AuthProvider fromRegistrationId(String registrationId) {
		return valueOf(registrationId.toUpperCase(Locale.ROOT));
	}
}
