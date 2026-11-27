package com.example.eshop.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.eshop.common.PageResponse;
import com.example.eshop.config.SecurityConfig;
import com.example.eshop.order.OrderService;
import com.example.eshop.order.OrderStatus;
import com.example.eshop.product.ProductService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Web-layer slice test: only the MVC + security config is loaded, services are mocked.
 * Focus: who may call the admin API.
 */
@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
class AdminControllerTest {

    @Autowired MockMvc mvc;

    @MockitoBean ProductService products;
    @MockitoBean AdminUserService users;
    @MockitoBean OrderService orders;

    static RequestPostProcessor asUser() {
        return jwt().jwt(j -> j.subject("2")).authorities(new SimpleGrantedAuthority("ROLE_USER"));
    }

    static RequestPostProcessor asAdmin() {
        return jwt().jwt(j -> j.subject("1")).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void anonymous_gets401() throws Exception {
        mvc.perform(get("/api/admin/orders")).andExpect(status().isUnauthorized());
    }

    @Test
    void customer_gets403() throws Exception {
        mvc.perform(get("/api/admin/orders").with(asUser())).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").with(asUser())).andExpect(status().isForbidden());
    }

    @Test
    void admin_canListCurrentOrders() throws Exception {
        when(orders.search(eq(OrderService.Scope.CURRENT), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mvc.perform(get("/api/admin/orders").param("scope", "CURRENT").with(asAdmin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void admin_canChangeOrderStatus() throws Exception {
        mvc.perform(patch("/api/admin/orders/5/status").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"SHIPPED\"}"))
                .andExpect(status().isOk());

        verify(orders).changeStatus(5L, OrderStatus.SHIPPED);
    }

    @Test
    void missingStatus_gets400() throws Exception {
        mvc.perform(patch("/api/admin/orders/5/status").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void admin_seesInactiveProductsToo() throws Exception {
        when(products.search(any(), any(), eq(false), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mvc.perform(get("/api/admin/products").with(asAdmin())).andExpect(status().isOk());

        verify(products).search(null, null, false, 0, 20);
    }

    @Test
    void admin_canChangeAProductDescription() throws Exception {
        mvc.perform(put("/api/admin/products/3/description").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"Hand-glazed mugs for slow mornings.\"}"))
                .andExpect(status().isOk());

        verify(products).changeDescription(3L, "Hand-glazed mugs for slow mornings.");
    }

    @Test
    void descriptionLongerThanTheColumn_gets400() throws Exception {
        mvc.perform(put("/api/admin/products/3/description").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"" + "x".repeat(2001) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void customerCannotChangeDescriptions() throws Exception {
        mvc.perform(put("/api/admin/products/3/description").with(asUser())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"x\"}"))
                .andExpect(status().isForbidden());
    }
}
