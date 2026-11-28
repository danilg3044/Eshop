package com.example.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.util.UriComponentsBuilder;

import com.jayway.jsonpath.JsonPath;

/**
 * The real OAuth2 flows against SQL Server in Docker (Testcontainers), exactly as the Angular app runs them:
 * authorization code + PKCE with the sign-in page in between, then the token exchange.
 * Runs in {@code mvn verify} (failsafe).
 */
@SpringBootTest(properties = {
		"eureka.client.enabled=false",
		"identity.admin.email=admin@test.local",
		"identity.admin.password=Admin123!"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthServerFlowIT {

	static final String REDIRECT_URI = "http://localhost:4200/auth/callback";

	@Autowired MockMvc mvc;
	@Autowired JwtDecoder jwtDecoder;

	@Test
	void seededAdminSignsInWithPkceAndGetsTokensWithAccountClaims() throws Exception {
		Pkce pkce = Pkce.create();
		MockHttpSession session = startAuthorization(pkce);

		// 2. The sign-in page posts the credentials; Spring Security continues the saved /oauth2/authorize request.
		MvcResult login = mvc.perform(post("/login").session(session).with(csrf())
						.param("username", "Admin@Test.local").param("password", "Admin123!"))
				.andExpect(status().is3xxRedirection())
				.andReturn();

		Jwt accessToken = finishAuthorization(login.getResponse().getRedirectedUrl(), session, pkce);

		assertThat(accessToken.getIssuer()).hasToString("http://localhost:9000");
		assertThat(accessToken.getSubject()).matches("\\d+"); // the account id, not the email
		assertThat(accessToken.getClaimAsString("email")).isEqualTo("admin@test.local");
		assertThat(accessToken.getClaimAsString("role")).isEqualTo("ADMIN");
		assertThat(accessToken.getClaimAsString("provider")).isEqualTo("LOCAL");
	}

	@Test
	void newCustomerRegistersAndContinuesToTheApp() throws Exception {
		Pkce pkce = Pkce.create();
		MockHttpSession session = startAuthorization(pkce);

		MvcResult registered = mvc.perform(post("/register").session(session).with(csrf())
						.param("firstName", "Dana").param("lastName", "Cohen")
						.param("email", "dana@example.com").param("password", "Secret123!"))
				.andExpect(status().is3xxRedirection())
				.andReturn();

		Jwt accessToken = finishAuthorization(registered.getResponse().getRedirectedUrl(), session, pkce);

		assertThat(accessToken.getClaimAsString("email")).isEqualTo("dana@example.com");
		assertThat(accessToken.getClaimAsString("role")).isEqualTo("USER");
		assertThat(accessToken.getClaimAsString("given_name")).isEqualTo("Dana");
		assertThat(accessToken.getClaimAsString("family_name")).isEqualTo("Cohen");
	}

	@Test
	void registrationIsValidatedAndRefusesATakenEmail() throws Exception {
		mvc.perform(post("/register").with(csrf())
						.param("firstName", "").param("lastName", "X").param("email", "not-an-email").param("password", "short"))
				.andExpect(status().isOk()) // the form again, with messages
				.andExpect(result -> assertThat(result.getResponse().getContentAsString())
						.contains("First name is required", "Enter a valid email address",
								"Password must be at least 8 characters"));

		mvc.perform(post("/register").with(csrf())
						.param("firstName", "A").param("lastName", "B").param("email", "admin@test.local")
						.param("password", "Secret123!"))
				.andExpect(result -> assertThat(result.getResponse().getContentAsString())
						.contains("This email is already registered"));
	}

	@Test
	void wrongPasswordReturnsToTheSignInPage() throws Exception {
		mvc.perform(post("/login").with(csrf()).param("username", "admin@test.local").param("password", "wrong"))
				.andExpect(status().is3xxRedirection())
				.andExpect(result -> assertThat(result.getResponse().getRedirectedUrl()).endsWith("/login?error"));
	}

	@Test
	void devClientGetsAMachineTokenWithClientCredentials() throws Exception {
		mvc.perform(post("/oauth2/token").with(httpBasic("dev-cli", "dev-secret"))
						.param("grant_type", "client_credentials").param("scope", "api"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.access_token").isNotEmpty());
	}

	@Test
	void publishesOpenIdDiscoveryForResourceServers() throws Exception {
		mvc.perform(get("/.well-known/openid-configuration"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.issuer").value("http://localhost:9000"))
				.andExpect(jsonPath("$.jwks_uri").value("http://localhost:9000/oauth2/jwks"));
	}

	@Test
	void theAppServedByTheBackendAtEshopMayAlsoSignIn() throws Exception {
		// its callback is registered too (an unknown redirect_uri would get a 400 error page, not the sign-in page)
		mvc.perform(get("/oauth2/authorize").accept(MediaType.TEXT_HTML)
						.queryParam("response_type", "code")
						.queryParam("client_id", "eshop-web")
						.queryParam("redirect_uri", "http://localhost:8080/eshop/auth/callback")
						.queryParam("scope", "openid")
						.queryParam("state", "s")
						.queryParam("code_challenge", Pkce.create().challenge())
						.queryParam("code_challenge_method", "S256"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/login"));
		// and its origin may call the token endpoint from the browser (CORS preflight)
		mvc.perform(options("/oauth2/token")
						.header("Origin", "http://localhost:8080")
						.header("Access-Control-Request-Method", "POST"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8080"));
	}

	/** 1. The app sends the browser to /oauth2/authorize; not signed in yet, so it is sent to the sign-in page. */
	private MockHttpSession startAuthorization(Pkce pkce) throws Exception {
		// queryParam, not param: the authorization endpoint reads a GET's parameters from the real query string
		MvcResult result = mvc.perform(get("/oauth2/authorize").accept(MediaType.TEXT_HTML)
						.queryParam("response_type", "code")
						.queryParam("client_id", "eshop-web")
						.queryParam("redirect_uri", REDIRECT_URI)
						.queryParam("scope", "openid profile email")
						.queryParam("state", "state-123")
						.queryParam("code_challenge", pkce.challenge())
						.queryParam("code_challenge_method", "S256"))
				.andExpect(status().is3xxRedirection())
				.andReturn();
		assertThat(result.getResponse().getRedirectedUrl()).endsWith("/login");
		return (MockHttpSession) result.getRequest().getSession(false);
	}

	/** 3. Back to /oauth2/authorize, now signed in: redirect to the app with a code. 4. Code + verifier -> tokens. */
	private Jwt finishAuthorization(String continueUrl, MockHttpSession session, Pkce pkce) throws Exception {
		String callback = mvc.perform(get(URI.create(continueUrl)).session(session))
				.andExpect(status().is3xxRedirection())
				.andReturn().getResponse().getRedirectedUrl();
		assertThat(callback).startsWith(REDIRECT_URI);
		var params = UriComponentsBuilder.fromUriString(callback).build().getQueryParams();
		assertThat(params.getFirst("state")).isEqualTo("state-123");

		String tokens = mvc.perform(post("/oauth2/token")
						.param("grant_type", "authorization_code")
						.param("code", params.getFirst("code"))
						.param("redirect_uri", REDIRECT_URI)
						.param("client_id", "eshop-web")
						.param("code_verifier", pkce.verifier()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id_token").isNotEmpty())
				.andReturn().getResponse().getContentAsString();
		return jwtDecoder.decode(JsonPath.read(tokens, "$.access_token"));
	}

	/** Proof Key for Code Exchange: the app keeps the verifier and sends only its SHA-256 (the challenge). */
	record Pkce(String verifier, String challenge) {
		static Pkce create() throws Exception {
			byte[] random = new byte[32];
			new SecureRandom().nextBytes(random);
			String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
			byte[] hash = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
			return new Pkce(verifier, Base64.getUrlEncoder().withoutPadding().encodeToString(hash));
		}
	}
}
