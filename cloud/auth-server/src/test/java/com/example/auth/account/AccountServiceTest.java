package com.example.auth.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;

import com.example.auth.account.AccountService.AccountRejectedException;

class AccountServiceTest {

	private final AccountRepository repository = mock(AccountRepository.class);
	private final AccountService service = new AccountService(repository,
			PasswordEncoderFactories.createDelegatingPasswordEncoder());

	@Test
	void registersCustomersWithAHashedPasswordAndANormalizedEmail() {
		when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		Account account = service.register("  Dana@Example.COM ", "Secret123!", " Dana ", "Cohen");

		assertThat(account.getEmail()).isEqualTo("dana@example.com");
		assertThat(account.getRole()).isEqualTo(Role.USER);
		assertThat(account.getFirstName()).isEqualTo("Dana");
		assertThat(account.getPasswordHash()).startsWith("{bcrypt}").doesNotContain("Secret123!");
	}

	@Test
	void refusesAnEmailThatIsAlreadyRegistered() {
		when(repository.existsByEmailIgnoreCase("dana@example.com")).thenReturn(true);

		assertThatThrownBy(() -> service.register("dana@example.com", "Secret123!", "D", "C"))
				.isInstanceOf(AccountRejectedException.class);
	}

	@Test
	void firstSocialSignInCreatesACustomerAccount() {
		when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		Account account = service.upsertSocial(AuthProvider.GOOGLE, "g-1", "Eve@Gmail.com", "Eve", "Levi");

		assertThat(account.getProvider()).isEqualTo(AuthProvider.GOOGLE);
		assertThat(account.getProviderId()).isEqualTo("g-1");
		assertThat(account.getRole()).isEqualTo(Role.USER);
		assertThat(account.getEmail()).isEqualTo("eve@gmail.com");
	}

	@Test
	void laterSocialSignInsFindTheLinkedAccount() {
		Account existing = new Account("eve@gmail.com", Role.USER, AuthProvider.GOOGLE, "Eve", "Levi");
		when(repository.findByProviderAndProviderId(AuthProvider.GOOGLE, "g-1")).thenReturn(Optional.of(existing));

		assertThat(service.upsertSocial(AuthProvider.GOOGLE, "g-1", "eve@gmail.com", "Eve", "Levi")).isSameAs(existing);
		verify(repository, never()).save(any());
	}

	@Test
	void neverLinksASocialSignInToAnEmailAndPasswordAccount() {
		Account local = new Account("admin@eshop.local", Role.ADMIN, AuthProvider.LOCAL, "Store", "Admin");
		when(repository.findByEmailIgnoreCase("admin@eshop.local")).thenReturn(Optional.of(local));

		assertThatThrownBy(() -> service.upsertSocial(AuthProvider.FACEBOOK, "f-9", "admin@eshop.local", null, null))
				.isInstanceOf(AccountRejectedException.class)
				.hasMessage("This email is registered with email & password sign-in");
	}
}
