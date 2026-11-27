package com.example.eshop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * End-to-end through the real application against SQL Server in Docker (Testcontainers):
 * Flyway migrations, JPA mappings, security and the order flow together.
 * Tokens are what cloud/auth-server would issue (same claims), injected with spring-security-test's jwt(),
 * so the auth server doesn't need to run. Runs in {@code mvn verify} (failsafe), not in {@code mvn test}.
 */
@SpringBootTest(properties = "eureka.client.enabled=false")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EshopFlowIT {

    @Autowired MockMvc mvc;

    /** A token as the auth server issues it: sub = account id, plus email/role/provider/names. */
    static RequestPostProcessor token(String sub, String email, String role, String first, String last) {
        return jwt().jwt(j -> j.subject(sub).claim("email", email).claim("role", role).claim("provider", "LOCAL")
                        .claim("given_name", first).claim("family_name", last))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }

    static final RequestPostProcessor DANA = token("101", "dana@example.com", "USER", "Dana", "Cohen");
    static final RequestPostProcessor ADMIN = token("1", "admin@test.local", "ADMIN", "Store", "Administrator");

    @Test
    void customerOrders_adminSeesAndShipsIt() throws Exception {
        // 1. First call with a new token: the shop creates its user record from the claims.
        mvc.perform(get("/api/auth/me").with(DANA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dana@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.profile.firstName").value("Dana"));

        // 2. Browses the seeded catalog (public) and picks a product.
        String catalog = mvc.perform(get("/api/products").param("q", "mug"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        int productId = JsonPath.read(catalog, "$.content[0].id");
        int stockBefore = JsonPath.read(catalog, "$.content[0].stock");

        // 3. Places an order.
        String order = mvc.perform(post("/api/orders").with(DANA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[{"productId":%d,"quantity":2}],
                                 "shipping":{"name":"Dana Cohen","addressLine":"1 Herzl St","city":"Haifa",
                                             "postalCode":"31000","country":"Israel"}}
                                """.formatted(productId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        int orderId = JsonPath.read(order, "$.id");

        mvc.perform(get("/api/products/" + productId))
                .andExpect(jsonPath("$.stock").value(stockBefore - 2));
        mvc.perform(get("/api/orders/mine").with(DANA))
                .andExpect(jsonPath("$[0].id").value(orderId));

        // 4. The customer can't reach the admin API.
        mvc.perform(get("/api/admin/orders").with(DANA)).andExpect(status().isForbidden());

        // 5. The admin sees the order among current orders...
        String current = mvc.perform(get("/api/admin/orders").param("scope", "CURRENT").with(ADMIN))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<java.util.List<Integer>>read(current, "$.content[*].id")).contains(orderId);

        // 6. ...and moves it through its lifecycle until it lands in history.
        for (String next : new String[] {"PAID", "SHIPPED", "DELIVERED"}) {
            mvc.perform(patch("/api/admin/orders/" + orderId + "/status").with(ADMIN)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"" + next + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(next));
        }
        mvc.perform(get("/api/admin/orders").param("scope", "HISTORY").with(ADMIN))
                .andExpect(jsonPath("$.content[?(@.id == " + orderId + ")].status").value("DELIVERED"));

        // 7. Admin views the customer's profile with the order count.
        mvc.perform(get("/api/admin/users").param("q", "dana").with(ADMIN))
                .andExpect(jsonPath("$.content[0].user.profile.firstName").value("Dana"))
                .andExpect(jsonPath("$.content[0].orderCount").value(1));
    }

    @Test
    void adminSavesAProductDescription() throws Exception {
        mvc.perform(put("/api/admin/products/1/description").with(ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"  Written by the AI service.  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Written by the AI service."));

        mvc.perform(get("/api/admin/products/1").with(ADMIN))
                .andExpect(jsonPath("$.description").value("Written by the AI service."));
    }

    @Test
    void sameAccountKeepsItsShopRecordAcrossTokens() throws Exception {
        RequestPostProcessor eve = token("202", "eve@example.com", "USER", "Eve", "Levi");
        String first = mvc.perform(get("/api/auth/me").with(eve)).andReturn().getResponse().getContentAsString();
        String again = mvc.perform(get("/api/auth/me").with(eve)).andReturn().getResponse().getContentAsString();

        assertThat((Integer) JsonPath.read(again, "$.id")).isEqualTo(JsonPath.read(first, "$.id"));
    }

    @Test
    void anonymousCallsToProtectedEndpoints_get401() throws Exception {
        mvc.perform(get("/api/orders/mine")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
}
