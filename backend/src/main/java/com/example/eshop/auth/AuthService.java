package com.example.eshop.auth;

import com.example.eshop.common.BusinessException;
import com.example.eshop.user.AppUser;
import com.example.eshop.user.AuthProvider;
import com.example.eshop.user.Role;
import com.example.eshop.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OneTimeCodeStore codes;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                       OneTimeCodeStore codes) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.codes = codes;
    }

    /** Self-registration always creates a customer (USER) account. */
    public TokenResponse register(AuthRequests.Register req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email is already registered");
        }
        AppUser user = new AppUser(email, Role.USER, AuthProvider.LOCAL);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.getProfile().setFirstName(req.firstName());
        user.getProfile().setLastName(req.lastName());
        return jwtService.issue(users.save(user));
    }

    @Transactional(readOnly = true)
    public TokenResponse login(AuthRequests.Login req) {
        AppUser user = users.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> u.getProvider() == AuthProvider.LOCAL && u.isEnabled() && u.getPasswordHash() != null)
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return jwtService.issue(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse exchange(String code) {
        Long userId = codes.consume(code)
                .orElseThrow(() -> new BadCredentialsException("Login code is invalid or expired"));
        AppUser user = users.findById(userId)
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new BadCredentialsException("Account is not available"));
        return jwtService.issue(user);
    }

    /**
     * Finds or creates the customer account for a Google/Facebook login.
     * An email that already belongs to an account with a different sign-in method is refused rather than
     * silently linked, and admins can never sign in this way.
     */
    public AppUser upsertSocialUser(AuthProvider provider, String providerId, String email,
                                    String firstName, String lastName) {
        String normalized = email.trim().toLowerCase();
        return users.findByEmailIgnoreCase(normalized)
                .map(existing -> {
                    if (existing.getProvider() != provider) {
                        throw new BadCredentialsException("This email is registered with %s sign-in"
                                .formatted(existing.getProvider().name().toLowerCase()));
                    }
                    if (!existing.isEnabled()) {
                        throw new BadCredentialsException("Account is disabled");
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    AppUser user = new AppUser(normalized, Role.USER, provider);
                    user.setProviderId(providerId);
                    user.getProfile().setFirstName(firstName);
                    user.getProfile().setLastName(lastName);
                    return users.save(user);
                });
    }
}
