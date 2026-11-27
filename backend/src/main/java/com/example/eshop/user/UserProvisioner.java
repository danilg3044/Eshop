package com.example.eshop.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes for {@link CurrentUsers}, each in its own transaction (REQUIRES_NEW): if two first requests of a new
 * user race and one insert fails on the unique subject, only that small transaction rolls back, not the caller's.
 */
@Service
@Transactional(propagation = Propagation.REQUIRES_NEW)
public class UserProvisioner {

    private final UserRepository users;

    public UserProvisioner(UserRepository users) {
        this.users = users;
    }

    /**
     * First request of a user the shop hasn't seen. An existing row with the same email is taken over (rows from
     * before the auth server, or after its database was reset): the auth server is the authority on who owns an
     * email. Otherwise a new user starts with the names from the token as profile.
     */
    public AppUser provision(TokenUser token) {
        AppUser user = users.findByEmailIgnoreCase(token.email())
                .orElseGet(() -> {
                    AppUser created = new AppUser(token.subject(), token.email(), token.role(), token.provider());
                    created.getProfile().setFirstName(token.firstName());
                    created.getProfile().setLastName(token.lastName());
                    return created;
                });
        user.syncFrom(token.subject(), token.email(), token.role(), token.provider());
        return users.saveAndFlush(user);
    }

    /** Email, role or provider changed at the auth server since the last request. */
    public AppUser update(AppUser user) {
        return users.save(user);
    }
}
