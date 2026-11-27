package com.example.eshop.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;

/**
 * The shop's record of a customer or administrator: profile and orders.
 * Sign-in data (passwords, Google/Facebook ids) lives in cloud/auth-server; {@link #subject} links the two:
 * it is the "sub" claim of that user's tokens. Email, role and provider are copied from the token.
 */
@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The auth server's account id ("sub" claim); null only for rows created before the auth server existed. */
    @Column(unique = true)
    private String subject;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false)
    private Instant createdAt;

    @Embedded
    private Profile profile = new Profile();

    protected AppUser() {
        // for JPA
    }

    public AppUser(String subject, String email, Role role, AuthProvider provider) {
        this.subject = subject;
        this.email = email;
        this.role = role;
        this.provider = provider;
        this.createdAt = Instant.now();
    }

    /** Takes over what the auth server says about this user. Returns true if anything changed. */
    public boolean syncFrom(String subject, String email, Role role, AuthProvider provider) {
        boolean changed = !Objects.equals(this.subject, subject) || !Objects.equals(this.email, email)
                || this.role != role || this.provider != provider;
        this.subject = subject;
        this.email = email;
        this.role = role;
        this.provider = provider;
        return changed;
    }

    public Long getId() { return id; }
    public String getSubject() { return subject; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public AuthProvider getProvider() { return provider; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Instant getCreatedAt() { return createdAt; }

    public Profile getProfile() {
        if (profile == null) {
            profile = new Profile(); // Hibernate sets an all-null embeddable to null
        }
        return profile;
    }
}
