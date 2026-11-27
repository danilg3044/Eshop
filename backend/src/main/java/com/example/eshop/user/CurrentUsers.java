package com.example.eshop.user;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

/**
 * The shop user behind a token. Accounts live in cloud/auth-server; the shop creates its own record (profile,
 * orders) the first time it sees a user ("just-in-time provisioning") and keeps email/role in sync afterwards.
 */
@Service
public class CurrentUsers {

    private final UserRepository users;
    private final UserProvisioner provisioner;

    public CurrentUsers(UserRepository users, UserProvisioner provisioner) {
        this.users = users;
        this.provisioner = provisioner;
    }

    public AppUser get(Jwt jwt) {
        TokenUser token = TokenUser.from(jwt);
        return users.findBySubject(token.subject())
                .map(user -> user.syncFrom(token.subject(), token.email(), token.role(), token.provider())
                        ? provisioner.update(user) : user)
                .orElseGet(() -> provisionOnce(token));
    }

    public Long id(Jwt jwt) {
        return get(jwt).getId();
    }

    private AppUser provisionOnce(TokenUser token) {
        try {
            return provisioner.provision(token);
        } catch (DataIntegrityViolationException raced) {
            // A parallel request created the row a moment ago: use that one.
            return users.findBySubject(token.subject()).orElseThrow(() -> raced);
        }
    }
}
