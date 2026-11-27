package com.example.eshop.user;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * What a token from cloud/auth-server says about its user (see AccountClaims there).
 * Machine tokens (client credentials) carry no email and are not users of the shop.
 */
public record TokenUser(String subject, String email, Role role, AuthProvider provider,
                        String firstName, String lastName) {

    public static TokenUser from(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            throw new AccessDeniedException("This token does not belong to a user");
        }
        return new TokenUser(
                jwt.getSubject(),
                email,
                enumOr(Role.class, jwt.getClaimAsString("role"), Role.USER),
                enumOr(AuthProvider.class, jwt.getClaimAsString("provider"), AuthProvider.LOCAL),
                jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"));
    }

    private static <E extends Enum<E>> E enumOr(Class<E> type, String value, E fallback) {
        try {
            return value == null ? fallback : Enum.valueOf(type, value);
        } catch (IllegalArgumentException unknown) {
            return fallback;
        }
    }
}
