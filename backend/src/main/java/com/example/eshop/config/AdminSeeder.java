package com.example.eshop.config;

import com.example.eshop.user.AppUser;
import com.example.eshop.user.AuthProvider;
import com.example.eshop.user.Role;
import com.example.eshop.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Creates the first administrator from {@code eshop.admin.email/password} when the database has none.
 * Admins can't self-register and always sign in with email + password.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final EshopProperties props;

    public AdminSeeder(UserRepository users, PasswordEncoder passwordEncoder, EshopProperties props) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByRole(Role.ADMIN)) {
            return;
        }
        var admin = props.admin();
        if (!StringUtils.hasText(admin.email()) || !StringUtils.hasText(admin.password())) {
            log.warn("No admin account exists. Set eshop.admin.email and eshop.admin.password "
                    + "(or ESHOP_ADMIN_EMAIL / ESHOP_ADMIN_PASSWORD) to create one at startup.");
            return;
        }
        AppUser user = new AppUser(admin.email().trim().toLowerCase(), Role.ADMIN, AuthProvider.LOCAL);
        user.setPasswordHash(passwordEncoder.encode(admin.password()));
        user.getProfile().setFirstName("Store");
        user.getProfile().setLastName("Administrator");
        users.save(user);
        log.info("Created admin account {}", user.getEmail());
    }
}
