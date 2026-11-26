package com.example.eshop.auth;

import com.example.eshop.common.NotFoundException;
import com.example.eshop.user.UserDto;
import com.example.eshop.user.UserRepository;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository users;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrations;

    public AuthController(AuthService authService, UserRepository users,
                          ObjectProvider<ClientRegistrationRepository> clientRegistrations) {
        this.authService = authService;
        this.users = users;
        this.clientRegistrations = clientRegistrations;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody AuthRequests.Register body) {
        return authService.register(body);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody AuthRequests.Login body) {
        return authService.login(body);
    }

    /** Trades the one-time code from a Google/Facebook login for a JWT. */
    @PostMapping("/exchange")
    public TokenResponse exchange(@Valid @RequestBody AuthRequests.Exchange body) {
        return authService.exchange(body.code());
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return users.findById(CurrentUser.id(jwt)).map(UserDto::from)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    /** Which social logins are configured, e.g. ["google","facebook"], so the UI can show only those buttons. */
    @GetMapping("/providers")
    public List<String> providers() {
        List<String> ids = new ArrayList<>();
        if (clientRegistrations.getIfAvailable() instanceof Iterable<?> registrations) {
            registrations.forEach(r -> ids.add(((ClientRegistration) r).getRegistrationId()));
        }
        return ids;
    }
}
