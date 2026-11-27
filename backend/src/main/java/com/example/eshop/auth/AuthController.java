package com.example.eshop.auth;

import com.example.eshop.user.CurrentUsers;
import com.example.eshop.user.UserDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sign-in itself happens at cloud/auth-server. The app calls this right after receiving a token: it returns
 * the shop's record of the user, creating it on the first call.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUsers currentUsers;

    public AuthController(CurrentUsers currentUsers) {
        this.currentUsers = currentUsers;
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.from(currentUsers.get(jwt));
    }
}
