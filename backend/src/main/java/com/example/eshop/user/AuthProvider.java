package com.example.eshop.user;

/** How the account signs in. LOCAL accounts have a password; the others use OAuth2/OpenID. */
public enum AuthProvider {
    LOCAL,
    GOOGLE,
    FACEBOOK;

    /** Maps a Spring Security client registration id ("google", "facebook") to a provider. */
    public static AuthProvider fromRegistrationId(String registrationId) {
        return valueOf(registrationId.toUpperCase());
    }
}
