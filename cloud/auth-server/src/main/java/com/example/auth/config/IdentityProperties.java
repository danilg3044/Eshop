package com.example.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code identity.*} settings in application.yml. */
@ConfigurationProperties(prefix = "identity")
public record IdentityProperties(String frontendUrl, Admin admin) {

	public record Admin(String email, String password) {}
}
