package com.example.eshop.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

/** Just-in-time provisioning: the shop's user record for a token from cloud/auth-server. */
class CurrentUsersTest {

    private final UserRepository users = mock(UserRepository.class);
    private final UserProvisioner provisioner = new UserProvisioner(users);
    private final CurrentUsers currentUsers = new CurrentUsers(users, provisioner);

    private static Jwt token(String sub, String email, String role) {
        return Jwt.withTokenValue("t").header("alg", "RS256")
                .subject(sub).claim("email", email).claim("role", role).claim("provider", "LOCAL")
                .claim("given_name", "Dana").claim("family_name", "Cohen")
                .build();
    }

    @Test
    void knownSubjectReturnsTheExistingUserWithoutWriting() {
        AppUser dana = new AppUser("42", "dana@example.com", Role.USER, AuthProvider.LOCAL);
        when(users.findBySubject("42")).thenReturn(Optional.of(dana));

        assertThat(currentUsers.get(token("42", "dana@example.com", "USER"))).isSameAs(dana);
        verify(users, never()).save(any());
    }

    @Test
    void roleChangedAtTheAuthServerIsCopied() {
        AppUser dana = new AppUser("42", "dana@example.com", Role.USER, AuthProvider.LOCAL);
        when(users.findBySubject("42")).thenReturn(Optional.of(dana));
        when(users.save(dana)).thenReturn(dana);

        assertThat(currentUsers.get(token("42", "dana@example.com", "ADMIN")).getRole()).isEqualTo(Role.ADMIN);
        verify(users).save(dana);
    }

    @Test
    void newUserIsCreatedWithTheNamesFromTheToken() {
        when(users.findBySubject("42")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("dana@example.com")).thenReturn(Optional.empty());
        when(users.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        AppUser created = currentUsers.get(token("42", "dana@example.com", "USER"));

        assertThat(created.getSubject()).isEqualTo("42");
        assertThat(created.getProfile().getFirstName()).isEqualTo("Dana");
        assertThat(created.getProfile().getLastName()).isEqualTo("Cohen");
    }

    @Test
    void existingRowWithTheSameEmailIsTakenOverWithItsOrders() {
        AppUser legacy = new AppUser(null, "dana@example.com", Role.USER, AuthProvider.LOCAL);
        when(users.findBySubject("42")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("dana@example.com")).thenReturn(Optional.of(legacy));
        when(users.saveAndFlush(legacy)).thenReturn(legacy);

        assertThat(currentUsers.get(token("42", "dana@example.com", "USER"))).isSameAs(legacy);
        assertThat(legacy.getSubject()).isEqualTo("42");
    }

    @Test
    void parallelFirstRequestsEndUpWithOneRow() {
        AppUser winner = new AppUser("42", "dana@example.com", Role.USER, AuthProvider.LOCAL);
        when(users.findBySubject("42")).thenReturn(Optional.empty(), Optional.of(winner));
        when(users.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_users_subject"));

        assertThat(currentUsers.get(token("42", "dana@example.com", "USER"))).isSameAs(winner);
    }

    @Test
    void machineTokensAreNotShopUsers() {
        Jwt machine = Jwt.withTokenValue("t").header("alg", "RS256").subject("dev-cli").build();

        assertThatThrownBy(() -> currentUsers.get(machine)).isInstanceOf(AccessDeniedException.class);
    }
}
