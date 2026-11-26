package com.example.eshop.order;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.eshop.auth.OAuth2LoginSuccessHandler;
import com.example.eshop.common.BusinessException;
import com.example.eshop.config.SecurityConfig;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderControllerTest {

    static final String VALID_ORDER = """
            {"items":[{"productId":1,"quantity":2}],
             "shipping":{"name":"Dana","addressLine":"1 Main St","city":"Haifa","postalCode":"31000","country":"Israel"}}
            """;

    @Autowired MockMvc mvc;

    @MockitoBean OrderService service;
    @MockitoBean OAuth2LoginSuccessHandler oauth2Handler;

    @Test
    void placingAnOrderRequiresLogin() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ordersArePlacedForTheUserInTheToken() throws Exception {
        when(service.place(eq(7L), any())).thenReturn(null);

        mvc.perform(post("/api/orders").with(jwt().jwt(j -> j.subject("7")))
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER))
                .andExpect(status().isCreated());
    }

    @Test
    void emptyCartAndMissingAddress_get400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/orders").with(jwt().jwt(j -> j.subject("7")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void businessRuleViolation_gets409ProblemDetail() throws Exception {
        when(service.place(eq(7L), any())).thenThrow(new BusinessException("Not enough stock for 'Mug'"));

        mvc.perform(post("/api/orders").with(jwt().jwt(j -> j.subject("7")))
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Not enough stock for 'Mug'"));
    }

    @Test
    void myOrders_returnsOnlyTheCallersOrders() throws Exception {
        when(service.forUser(7L)).thenReturn(List.of());

        mvc.perform(get("/api/orders/mine").with(jwt().jwt(j -> j.subject("7"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
