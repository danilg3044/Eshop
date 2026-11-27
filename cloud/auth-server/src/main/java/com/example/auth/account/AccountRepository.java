package com.example.auth.account;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {

	Optional<Account> findByEmailIgnoreCase(String email);

	Optional<Account> findByProviderAndProviderId(AuthProvider provider, String providerId);

	boolean existsByEmailIgnoreCase(String email);

	boolean existsByRole(Role role);
}
