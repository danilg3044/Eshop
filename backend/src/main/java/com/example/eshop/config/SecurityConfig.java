package com.example.eshop.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * The shop is an OAuth2 <b>resource server</b>: it accepts the JWTs issued by cloud/auth-server and nothing else.
 * Spring Boot builds the decoder from {@code spring.security.oauth2.resourceserver.jwt.issuer-uri}: it checks the
 * signature with the auth server's published keys (JWKS), the issuer and the expiry. No secrets live here.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /** The auth server puts USER / ADMIN into this claim. */
    public static final String ROLE_CLAIM = "role";

    @Bean
    SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable) // bearer tokens, no cookies, so CSRF does not apply
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/error").permitAll()
                        // The Angular app's files (FrontendConfig); it signs in itself and sends tokens to /api.
                        .requestMatchers("/", "/eshop", "/eshop/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(rs -> rs.jwt(jwt -> jwt.jwtAuthenticationConverter(roleConverter())));
        return http.build();
    }

    /** Turns the "role" claim (USER / ADMIN) into Spring authorities ROLE_USER / ROLE_ADMIN. */
    public static JwtAuthenticationConverter roleConverter() {
        var authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(ROLE_CLAIM);
        authorities.setAuthorityPrefix("ROLE_");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(EshopProperties props) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(props.frontendUrl()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
