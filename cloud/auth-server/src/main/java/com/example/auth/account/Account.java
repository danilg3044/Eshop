package com.example.auth.account;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A sign-in identity. Its id becomes the "sub" claim of every token issued for it. */
@Entity
@Table(name = "accounts")
public class Account {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String email;

	/** BCrypt hash; null for Google/Facebook accounts. */
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private AuthProvider provider;

	/** The user's id at Google/Facebook. */
	private String providerId;

	private String firstName;

	private String lastName;

	@Column(nullable = false)
	private boolean enabled = true;

	@Column(nullable = false)
	private Instant createdAt;

	protected Account() {
		// for JPA
	}

	public Account(String email, Role role, AuthProvider provider, String firstName, String lastName) {
		this.email = email;
		this.role = role;
		this.provider = provider;
		this.firstName = firstName;
		this.lastName = lastName;
		this.createdAt = Instant.now();
	}

	public Long getId() { return id; }
	public String getEmail() { return email; }
	public String getPasswordHash() { return passwordHash; }
	public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
	public Role getRole() { return role; }
	public AuthProvider getProvider() { return provider; }
	public String getProviderId() { return providerId; }
	public void setProviderId(String providerId) { this.providerId = providerId; }
	public String getFirstName() { return firstName; }
	public String getLastName() { return lastName; }
	public boolean isEnabled() { return enabled; }
	public Instant getCreatedAt() { return createdAt; }
}
