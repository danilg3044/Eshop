package com.example.auth.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed view of the {@code identity.*} settings in application.yml.
 *
 * @param frontendUrl    the shop, for "back to the shop" links
 * @param allowedOrigins where the Angular app may run (it calls /oauth2/token from the browser, so CORS):
 *                       the dev server and the backend that serves it at /eshop/
 */
@ConfigurationProperties(prefix = "identity")
public record IdentityProperties(String frontendUrl, List<String> allowedOrigins, Admin admin) {

	public record Admin(String email, String password) {}
}
