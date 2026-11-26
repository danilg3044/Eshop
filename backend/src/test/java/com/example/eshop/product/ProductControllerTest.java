package com.example.eshop.product;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.eshop.auth.OAuth2LoginSuccessHandler;
import com.example.eshop.common.NotFoundException;
import com.example.eshop.common.PageResponse;
import com.example.eshop.config.SecurityConfig;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProductController.class)
@Import(SecurityConfig.class)
class ProductControllerTest {

    @Autowired MockMvc mvc;

    @MockitoBean ProductService service;
    @MockitoBean OAuth2LoginSuccessHandler oauth2Handler;

    @Test
    void catalogIsPublic_andOnlyShowsActiveProducts() throws Exception {
        var mug = new ProductDto(1L, "HOME-002", "Mug", "Nice mug", "Home", new BigDecimal("24.90"), 80, null, true);
        when(service.search("mug", null, true, 0, 12)).thenReturn(new PageResponse<>(List.of(mug), 0, 12, 1, 1));

        mvc.perform(get("/api/products").param("q", "mug"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Mug"))
                .andExpect(jsonPath("$.content[0].price").value(24.90))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void unknownProduct_gets404() throws Exception {
        when(service.get(99L, true)).thenThrow(new NotFoundException("Product 99 not found"));

        mvc.perform(get("/api/products/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Product 99 not found"));
    }
}
