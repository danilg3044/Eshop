package com.example.auth.config;

import static org.springframework.security.config.Customizer.withDefaults;

import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Two filter chains:
 * <ol>
 *   <li>the <b>protocol endpoints</b> of the authorization server ({@code /oauth2/authorize}, {@code /oauth2/token},
 *       {@code /oauth2/jwks}, {@code /.well-known/openid-configuration}, {@code /userinfo}, {@code /connect/logout}...).
 *       A browser that isn't signed in is sent to the login page and comes back afterwards.</li>
 *   <li><b>everything else</b>: the login and registration pages, and Google/Facebook sign-in.</li>
 * </ol>
 * Registered clients, the issuer and the signing key come from Spring Boot (application.yml).
 */
@Configuration
public class SecurityConfig {

	@Bean
	@Order(1)
	SecurityFilterChain authorizationServerChain(HttpSecurity http) {
		http.oauth2AuthorizationServer(authorizationServer -> {
			http.securityMatcher(authorizationServer.getEndpointsMatcher());
			authorizationServer.oidc(withDefaults()); // OpenID Connect: id tokens, discovery, userinfo, logout
		});
		http.authorizeHttpRequests(authorize -> authorize.anyRequest().authenticated())
				.cors(withDefaults()) // the Angular app calls /oauth2/token from :4200 or :8080
				.oauth2ResourceServer(resourceServer -> resourceServer.jwt(withDefaults())) // for /userinfo
				.exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor(
						new LoginUrlAuthenticationEntryPoint("/login"), htmlRequests()));
		return http.build();
	}

	@Bean
	@Order(2)
	SecurityFilterChain loginChain(HttpSecurity http, ObjectProvider<ClientRegistrationRepository> socialProviders,
			SocialLoginHandler socialLoginHandler) {
		http.authorizeHttpRequests(authorize -> authorize
						.requestMatchers("/login", "/register", "/css/**", "/error", "/actuator/health/**").permitAll()
						.anyRequest().authenticated())
				.formLogin(form -> form.loginPage("/login").failureUrl("/login?error"));
		// Google/Facebook buttons only exist when their credentials are configured (application-local.yml).
		if (socialProviders.getIfAvailable() != null) {
			http.oauth2Login(oauth2 -> oauth2.loginPage("/login")
					.successHandler(socialLoginHandler)
					.failureHandler(socialLoginHandler));
		}
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder(); // bcrypt by default
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(IdentityProperties props) {
		var config = new CorsConfiguration();
		config.setAllowedOrigins(props.allowedOrigins());
		config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
		config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		var source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	/** Browsers (Accept: text/html) get the login page; API clients get a plain 401. */
	private static MediaTypeRequestMatcher htmlRequests() {
		var matcher = new MediaTypeRequestMatcher(MediaType.TEXT_HTML);
		matcher.setIgnoredMediaTypes(Set.of(MediaType.ALL));
		return matcher;
	}
}
