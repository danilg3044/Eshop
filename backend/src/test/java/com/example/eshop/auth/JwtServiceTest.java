package com.example.eshop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.eshop.config.EshopProperties;
import com.example.eshop.config.SecurityConfig;
import com.example.eshop.user.AppUser;
import com.example.eshop.user.AuthProvider;
import com.example.eshop.user.Role;
import java.time.Duration;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** Round-trips a token through the real encoder and decoder beans from SecurityConfig. */
class JwtServiceTest {

    static final String SECRET = "unit-test-secret-unit-test-secret-0123456789";

    SecurityConfig config = new SecurityConfig();
    EshopProperties props = new EshopProperties("http://localhost:4200",
            new EshopProperties.Jwt(SECRET, Duration.ofMinutes(30)), new EshopProperties.Admin(null, null));
    SecretKey key = config.jwtKey(props);
    JwtService service = new JwtService(config.jwtEncoder(key), props);
    JwtDecoder decoder = config.jwtDecoder(key);

    @Test
    void issuedTokenCarriesUserIdEmailAndRole() {
        AppUser admin = new AppUser("boss@eshop.local", Role.ADMIN, AuthProvider.LOCAL);
        ReflectionTestUtils.setField(admin, "id", 5L);

        TokenResponse token = service.issue(admin);
        Jwt jwt = decoder.decode(token.accessToken());

        assertThat(jwt.getSubject()).isEqualTo("5");
        assertThat(jwt.getClaimAsString("email")).isEqualTo("boss@eshop.local");
        assertThat(jwt.getClaimAsString(JwtService.ROLE_CLAIM)).isEqualTo("ADMIN");
        assertThat(jwt.getExpiresAt()).isEqualTo(token.expiresAt());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        SecretKey otherKey = new SecretKeySpec("another-secret-another-secret-0123456789".getBytes(), "HmacSHA256");
        JwtService forger = new JwtService(new NimbusJwtEncoder(
                new com.nimbusds.jose.jwk.source.ImmutableSecret<>(otherKey)), props);
        AppUser user = new AppUser("eve@example.com", Role.ADMIN, AuthProvider.LOCAL);
        ReflectionTestUtils.setField(user, "id", 1L);

        String forged = forger.issue(user).accessToken();

        assertThatThrownBy(() -> decoder.decode(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void shortSecretIsRefusedAtStartup() {
        var weak = new EshopProperties("x", new EshopProperties.Jwt("too-short", Duration.ofMinutes(1)), null);
        assertThatThrownBy(() -> config.jwtKey(weak)).isInstanceOf(IllegalStateException.class);
    }
}
