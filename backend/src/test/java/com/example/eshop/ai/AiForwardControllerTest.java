package com.example.eshop.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.eshop.config.EshopProperties;
import com.example.eshop.config.SecurityConfig;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** /api/ai/** is passed on to ai-service (a JDK HttpServer stub here) with the caller's token. */
@WebMvcTest(AiForwardController.class)
@Import(SecurityConfig.class)
class AiForwardControllerTest {

    static final AtomicReference<String> seenAuthorization = new AtomicReference<>();
    static final AtomicReference<String> seenBody = new AtomicReference<>();
    static HttpServer aiService;

    @DynamicPropertySource
    static void aiServiceUrl(DynamicPropertyRegistry registry) throws IOException {
        aiService = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        aiService.createContext("/api/ai/product-descriptions", exchange -> {
            seenAuthorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            seenBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] answer = "{\"description\":\"Nice.\",\"highlights\":[]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(201, answer.length);
            exchange.getResponseBody().write(answer);
            exchange.close();
        });
        aiService.createContext("/api/ai/forbidden", exchange -> {
            exchange.sendResponseHeaders(403, -1);
            exchange.close();
        });
        aiService.start();
        registry.add("eshop.ai-service-url", () -> "http://localhost:" + aiService.getAddress().getPort());
    }

    @AfterAll
    static void stop() {
        aiService.stop(0);
    }

    @Autowired MockMvc mvc;

    @Test
    void forwardsBodyAndTokenAndReturnsTheAnswerAsItIs() throws Exception {
        mvc.perform(post("/api/ai/product-descriptions")
                        .with(jwt().jwt(j -> j.tokenValue("the-token")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Lamp\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Nice."));

        assertThat(seenAuthorization.get()).isEqualTo("Bearer the-token");
        assertThat(seenBody.get()).isEqualTo("{\"name\":\"Lamp\"}");
    }

    @Test
    void passesErrorStatusesThrough() throws Exception {
        mvc.perform(post("/api/ai/forbidden").with(jwt())).andExpect(status().isForbidden());
    }

    @Test
    void needsAToken() throws Exception {
        mvc.perform(post("/api/ai/product-descriptions")).andExpect(status().isUnauthorized());
    }

    @Test
    void aiServiceDown_is503() {
        var down = new AiForwardController(new EshopProperties(null, null, "http://localhost:1")); // nothing listens
        var thrown = assertThrows(AiServiceDownException.class,
                () -> down.forward(new MockHttpServletRequest("POST", "/api/ai/product-descriptions"),
                        Jwt.withTokenValue("t").header("alg", "none").claim("sub", "1").build(), null));
        assertThat(thrown.getStatusCode().value()).isEqualTo(503);
    }
}
