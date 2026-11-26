package com.example.eshop.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request bodies for {@link AuthController}. */
public final class AuthRequests {

    private AuthRequests() {
    }

    public record Register(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName) {}

    public record Login(@NotBlank String email, @NotBlank String password) {}

    public record Exchange(@NotBlank String code) {}
}
