package com.example.eshop.user;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own profile (customers and admins alike). */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository users;
    private final CurrentUsers currentUsers;

    public ProfileController(UserRepository users, CurrentUsers currentUsers) {
        this.users = users;
        this.currentUsers = currentUsers;
    }

    @GetMapping
    public UserDto get(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.from(currentUsers.get(jwt));
    }

    @PutMapping
    @Transactional
    public UserDto update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileDto body) {
        AppUser user = currentUsers.get(jwt);
        body.applyTo(user.getProfile());
        return UserDto.from(users.save(user));
    }

}
