package com.example.eshop.auth;

import com.example.eshop.config.EshopProperties;
import com.example.eshop.user.AppUser;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Issues the app's own access tokens (HS256 JWT). The same token is used no matter how the user
 * signed in (password, Google or Facebook), so the API only has to understand one kind of token.
 */
@Service
public class JwtService {

    public static final String ISSUER = "eshop";
    public static final String ROLE_CLAIM = "role";

    private final JwtEncoder encoder;
    private final EshopProperties props;

    public JwtService(JwtEncoder encoder, EshopProperties props) {
        this.encoder = encoder;
        this.props = props;
    }

    public TokenResponse issue(AppUser user) {
        // JWT times have one-second precision; truncate so expiresAt matches the token's "exp" exactly.
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        Instant expiresAt = now.plus(props.jwt().ttl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("email", user.getEmail())
                .claim(ROLE_CLAIM, user.getRole().name())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenResponse(token, expiresAt);
    }
}
