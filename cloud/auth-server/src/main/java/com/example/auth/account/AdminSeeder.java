package com.example.auth.account;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.example.auth.config.IdentityProperties;

/**
 * Creates the first administrator from {@code identity.admin.email/password} when there is none.
 * Admins can't self-register and always sign in with email + password.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

	private final AccountRepository accounts;
	private final AccountService accountService;
	private final IdentityProperties props;

	public AdminSeeder(AccountRepository accounts, AccountService accountService, IdentityProperties props) {
		this.accounts = accounts;
		this.accountService = accountService;
		this.props = props;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (accounts.existsByRole(Role.ADMIN)) {
			return;
		}
		var admin = props.admin();
		if (!StringUtils.hasText(admin.email()) || !StringUtils.hasText(admin.password())) {
			log.warn("No admin account exists. Set identity.admin.email and identity.admin.password "
					+ "(or ESHOP_ADMIN_EMAIL / ESHOP_ADMIN_PASSWORD) to create one at startup.");
			return;
		}
		log.info("Created admin account {}", accountService.createAdmin(admin.email(), admin.password()).getEmail());
	}
}
