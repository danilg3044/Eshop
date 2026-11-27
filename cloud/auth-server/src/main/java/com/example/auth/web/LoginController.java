package com.example.auth.web;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.example.auth.config.IdentityProperties;

@Controller
public class LoginController {

	/** A configured social sign-in, e.g. ("google", "Google"). */
	public record SocialProvider(String id, String name) {}

	private final ObjectProvider<ClientRegistrationRepository> registrations;
	private final IdentityProperties props;

	public LoginController(ObjectProvider<ClientRegistrationRepository> registrations, IdentityProperties props) {
		this.registrations = registrations;
		this.props = props;
	}

	/** The sign-in page. Spring Security handles the POST (form login). */
	@GetMapping("/login")
	public String login(Model model) {
		model.addAttribute("providers", socialProviders());
		model.addAttribute("shopUrl", props.frontendUrl());
		return "login";
	}

	/** Nothing to show here on its own: send people to the shop. */
	@GetMapping("/")
	public String home() {
		return "redirect:" + props.frontendUrl();
	}

	private List<SocialProvider> socialProviders() {
		List<SocialProvider> providers = new ArrayList<>();
		if (registrations.getIfAvailable() instanceof Iterable<?> all) {
			all.forEach(r -> {
				var registration = (ClientRegistration) r;
				providers.add(new SocialProvider(registration.getRegistrationId(), registration.getClientName()));
			});
		}
		return providers;
	}
}
