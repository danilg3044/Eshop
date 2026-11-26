package com.example.eshop.auth;

import java.time.Instant;

public record TokenResponse(String accessToken, Instant expiresAt) {
}
