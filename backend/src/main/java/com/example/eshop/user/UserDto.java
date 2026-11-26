package com.example.eshop.user;

import java.time.Instant;

/** Account as returned to the client. Never includes the password hash. */
public record UserDto(
        Long id,
        String email,
        Role role,
        AuthProvider provider,
        boolean enabled,
        Instant createdAt,
        ProfileDto profile) {

    public static UserDto from(AppUser u) {
        return new UserDto(u.getId(), u.getEmail(), u.getRole(), u.getProvider(),
                u.isEnabled(), u.getCreatedAt(), ProfileDto.from(u.getProfile()));
    }
}
