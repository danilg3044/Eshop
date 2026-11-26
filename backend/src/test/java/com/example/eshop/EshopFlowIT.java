package com.example.eshop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * End-to-end through the real application against SQL Server in Docker (Testcontainers):
 * Flyway migrations, JPA mappings, security and the order flow together.
 * Runs in {@code mvn verify} (failsafe), not in {@code mvn test}.
 */
@SpringBootTest(properties = {
        "eshop.admin.email=admin@test.local",
        "eshop.admin.password=Admin123!"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EshopFlowIT {

    @Autowired MockMvc mvc;

    @Test
    void customerOrders_adminSeesAndShipsIt() throws Exception {
        // 1. A customer registers and gets a token straight away.
        String userToken = token(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"dana@example.com","password":"Secret123!","firstName":"Dana","lastName":"Cohen"}
                                """))
                .andExpect(status().isCreated()));

        // 2. Browses the seeded catalog (public) and picks a product.
        String catalog = mvc.perform(get("/api/products").param("q", "mug"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        int productId = JsonPath.read(catalog, "$.content[0].id");
        int stockBefore = JsonPath.read(catalog, "$.content[0].stock");

        // 3. Places an order.
        String order = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + userToken)
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
        mvc.perform(get("/api/orders/mine").header("Authorization", "Bearer " + userToken))
                .andExpect(jsonPath("$[0].id").value(orderId));

        // 4. The customer can't reach the admin API.
        mvc.perform(get("/api/admin/orders").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // 5. The seeded admin logs in and sees the order among current orders.
        String adminToken = token(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"Admin123!\"}"))
                .andExpect(status().isOk()));
        String current = mvc.perform(get("/api/admin/orders").param("scope", "CURRENT")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<java.util.List<Integer>>read(current, "$.content[*].id")).contains(orderId);

        // 6. Admin moves it through its lifecycle until it lands in history.
        for (String next : new String[] {"PAID", "SHIPPED", "DELIVERED"}) {
            mvc.perform(patch("/api/admin/orders/" + orderId + "/status")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"" + next + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(next));
        }
        mvc.perform(get("/api/admin/orders").param("scope", "HISTORY").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.content[?(@.id == " + orderId + ")].status").value("DELIVERED"));

        // 7. Admin views the customer's profile with the order count.
        mvc.perform(get("/api/admin/users").param("q", "dana").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.content[0].user.profile.firstName").value("Dana"))
                .andExpect(jsonPath("$.content[0].orderCount").value(1));
    }

    @Test
    void wrongPassword_gets401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    private static String token(ResultActions result) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.accessToken");
    }
}
