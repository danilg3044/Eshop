package com.example.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * OAuth2 / OpenID Connect authorization server (Spring Authorization Server) on http://localhost:9000.
 * Owns the accounts: sign-in and registration pages, Google/Facebook federation, the seeded admin.
 * Issues the JWTs that the shop backend and every microservice validate (they only need the issuer URL).
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class AuthServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(AuthServerApplication.class, args);
	}
}
