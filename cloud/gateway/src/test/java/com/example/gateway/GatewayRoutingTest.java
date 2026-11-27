package com.example.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.sun.net.httpserver.HttpServer;

/**
 * Runs the real gateway with its real routes (application.yml), but instead of Eureka it uses Spring Cloud's
 * "simple" discovery client pointing at tiny stub servers. So we test routing and load balancing, not Eureka.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "eureka.client.enabled=false")
class GatewayRoutingTest {

	private static HttpServer arithmeticA;
	private static HttpServer arithmeticB;
	private static HttpServer strings;
	private static HttpServer eshop;

	@LocalServerPort
	int port;

	private final HttpClient http = HttpClient.newHttpClient();

	@DynamicPropertySource
	static void stubServices(DynamicPropertyRegistry registry) throws IOException {
		arithmeticA = stub("arithmetic-A");
		arithmeticB = stub("arithmetic-B");
		strings = stub("strings-1");
		eshop = stub("eshop-1");
		String prefix = "spring.cloud.discovery.client.simple.instances.";
		registry.add(prefix + "arithmetic-service[0].uri", () -> uri(arithmeticA));
		registry.add(prefix + "arithmetic-service[1].uri", () -> uri(arithmeticB));
		registry.add(prefix + "string-service[0].uri", () -> uri(strings));
		registry.add(prefix + "eshop[0].uri", () -> uri(eshop));
	}

	@AfterAll
	static void stopStubs() {
		arithmeticA.stop(0);
		arithmeticB.stop(0);
		strings.stop(0);
		eshop.stop(0);
	}

	@Test
	void routesArithmeticRequestsWithPathAndQueryUnchanged() throws Exception {
		HttpResponse<String> response = get("/api/arithmetic/add?a=2&b=3");

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("arithmetic-").contains("/api/arithmetic/add?a=2&b=3");
		assertThat(response.headers().firstValue("X-Gateway-Route")).hasValue("arithmetic");
	}

	@Test
	void routesStringRequests() throws Exception {
		HttpResponse<String> response = get("/api/strings/reverse?text=abc");

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("strings-1").contains("/api/strings/reverse?text=abc");
		assertThat(response.headers().firstValue("X-Gateway-Route")).hasValue("strings");
	}

	@Test
	void loadBalancesAcrossAllInstancesOfAService() throws Exception {
		Set<String> servedBy = new HashSet<>();
		for (int i = 0; i < 4; i++) {
			String body = get("/api/arithmetic/add?a=1&b=1").body();
			servedBy.add(body.substring(body.indexOf("arithmetic-"), body.indexOf("arithmetic-") + "arithmetic-A".length()));
		}

		assertThat(servedBy).containsExactlyInAnyOrder("arithmetic-A", "arithmetic-B");
	}

	@Test
	void routesTheRestOfTheApiToTheShopBackend() throws Exception {
		HttpResponse<String> response = get("/api/products?page=0");

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("eshop-1").contains("/api/products?page=0");
		assertThat(response.headers().firstValue("X-Gateway-Route")).hasValue("eshop");
	}

	@Test
	void socialLoginAndSwaggerGoToTheShopBackendWithTheGatewayHostKept() throws Exception {
		for (String path : new String[] { "/oauth2/authorization/google", "/login/oauth2/code/google?code=x",
				"/swagger-ui.html", "/v3/api-docs" }) {
			String body = get(path).body();
			assertThat(body).as(path).contains("eshop-1");
			// PreserveHostHeader: the backend sees the gateway's address, so OAuth2 redirect URIs point at :8090
			assertThat(body).as(path).contains("\"host\":\"localhost:" + port + "\"");
		}
	}

	@Test
	void moreSpecificRoutesWinOverTheShopCatchAll() throws Exception {
		assertThat(get("/api/arithmetic/add?a=1&b=2").headers().firstValue("X-Gateway-Route")).hasValue("arithmetic");
		assertThat(get("/api/strings/length?text=x").headers().firstValue("X-Gateway-Route")).hasValue("strings");
	}

	@Test
	void unknownPathsAreNotRouted() throws Exception {
		assertThat(get("/unknown").statusCode()).isEqualTo(404);
	}

	private HttpResponse<String> get(String path) throws Exception {
		return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
				HttpResponse.BodyHandlers.ofString());
	}

	/** A stub "microservice" that answers every request with its name and the URI and Host header it received. */
	private static HttpServer stub(String name) throws IOException {
		HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
		server.createContext("/", exchange -> {
			byte[] body = ("{\"server\":\"" + name + "\",\"uri\":\"" + exchange.getRequestURI()
					+ "\",\"host\":\"" + exchange.getRequestHeaders().getFirst("Host") + "\"}")
					.getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().add("Content-Type", "application/json");
			exchange.sendResponseHeaders(200, body.length);
			exchange.getResponseBody().write(body);
			exchange.close();
		});
		server.start();
		return server;
	}

	private static String uri(HttpServer server) {
		return "http://localhost:" + server.getAddress().getPort();
	}
}
