package com.example.eshop.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code eshop.*} settings in application.yml. */
@ConfigurationProperties(prefix = "eshop")
public record EshopProperties(String frontendUrl, Jwt jwt, Admin admin) {

    public record Jwt(String secret, Duration ttl) {}

    public record Admin(String email, String password) {}
}
