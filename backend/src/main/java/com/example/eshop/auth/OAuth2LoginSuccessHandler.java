package com.example.eshop.auth;

import com.example.eshop.config.EshopProperties;
import com.example.eshop.user.AppUser;
import com.example.eshop.user.AuthProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Runs after Google/Facebook has authenticated the user (and on failure).
 * Creates the local account if needed, then redirects back to the Angular app with a one-time code.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private final AuthService authService;
    private final OneTimeCodeStore codes;
    private final EshopProperties props;

    public OAuth2LoginSuccessHandler(AuthService authService, OneTimeCodeStore codes, EshopProperties props) {
        this.authService = authService;
        this.codes = codes;
        this.props = props;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        var token = (OAuth2AuthenticationToken) authentication;
        String redirect;
        try {
            SocialProfile profile = SocialProfile.from(
                    token.getAuthorizedClientRegistrationId(), token.getPrincipal());
            AppUser user = authService.upsertSocialUser(profile.provider(), profile.providerId(),
                    profile.email(), profile.firstName(), profile.lastName());
            redirect = callbackUrl("code", codes.issue(user.getId()));
        } catch (AuthenticationException | IllegalArgumentException ex) {
            redirect = callbackUrl("error", ex.getMessage());
        }
        endSession(request); // the session was only needed during the OAuth2 round trip
        response.sendRedirect(redirect);
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        endSession(request);
        response.sendRedirect(callbackUrl("error", "Social login failed"));
    }

    private String callbackUrl(String param, String value) {
        return UriComponentsBuilder.fromUriString(props.frontendUrl())
                .path("/auth/callback")
                .queryParam(param, value)
                .encode()
                .toUriString();
    }

    private static void endSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    /** Normalizes the different attribute names Google (OpenID Connect) and Facebook use. */
    record SocialProfile(AuthProvider provider, String providerId, String email, String firstName, String lastName) {

        static SocialProfile from(String registrationId, OAuth2User user) {
            AuthProvider provider = AuthProvider.fromRegistrationId(registrationId);
            Map<String, Object> a = user.getAttributes();
            String email = (String) a.get("email");
            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("Your %s account did not share an email address"
                        .formatted(registrationId));
            }
            return switch (provider) {
                case GOOGLE -> new SocialProfile(provider, (String) a.get("sub"), email,
                        (String) a.get("given_name"), (String) a.get("family_name"));
                case FACEBOOK -> {
                    String name = (String) a.getOrDefault("name", "");
                    int space = name.indexOf(' ');
                    yield new SocialProfile(provider, String.valueOf(a.get("id")), email,
                            space < 0 ? name : name.substring(0, space),
                            space < 0 ? null : name.substring(space + 1));
                }
                case LOCAL -> throw new IllegalArgumentException("Not a social provider");
            };
        }
    }
}
