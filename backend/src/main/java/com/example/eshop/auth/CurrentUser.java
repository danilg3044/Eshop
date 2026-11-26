package com.example.eshop.auth;

import org.springframework.security.oauth2.jwt.Jwt;

/** Helpers for reading the signed-in user from the app's JWT. */
public final class CurrentUser {

    private CurrentUser() {
    }

    /** The JWT subject is the {@code users.id} of the account. */
    public static Long id(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
