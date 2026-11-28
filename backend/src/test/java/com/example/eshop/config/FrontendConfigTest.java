package com.example.eshop.config;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** The built Angular app, served from a folder on disk at /eshop/ (here a temp folder with two fake files). */
@WebMvcTest(FrontendConfig.class) // no controllers, just MVC + security + the static files
@Import({ SecurityConfig.class, FrontendConfig.class })
class FrontendConfigTest {

    @TempDir static Path dist;

    @DynamicPropertySource
    static void frontendDir(DynamicPropertyRegistry registry) throws IOException {
        Files.writeString(dist.resolve("index.html"), "<base href=\"/eshop/\"><app-root></app-root>");
        Files.writeString(dist.resolve("main-ABC123.js"), "console.log('app')");
        registry.add("eshop.frontend-dir", dist::toString);
    }

    @Autowired MockMvc mvc;

    @Test
    void servesFilesWithoutAToken() throws Exception {
        mvc.perform(get("/eshop/main-ABC123.js"))
                .andExpect(status().isOk())
                .andExpect(content().string("console.log('app')"))
                .andExpect(header().string("Cache-Control", "no-cache"));
    }

    @Test
    void appRoutesGetIndexHtml_soDeepLinksAndReloadsWork() throws Exception {
        mvc.perform(get("/eshop/")).andExpect(forwardedUrl("/eshop/index.html")); // MockMvc doesn't follow forwards
        mvc.perform(get("/eshop/index.html")).andExpect(content().string(containsString("<app-root>")));
        for (String route : new String[] { "/eshop/admin/orders", "/eshop/auth/callback?code=x&state=y" }) {
            mvc.perform(get(route)).andExpect(status().isOk()).andExpect(content().string(containsString("<app-root>")));
        }
    }

    @Test
    void missingFileWithAnExtension_is404_notIndexHtml() throws Exception {
        mvc.perform(get("/eshop/main-OLD.js")).andExpect(status().isNotFound());
    }

    @Test
    void rootAndBarePathRedirectToTheApp() throws Exception {
        mvc.perform(get("/eshop")).andExpect(redirectedUrl("/eshop/"));
        mvc.perform(get("/")).andExpect(redirectedUrl("/eshop/"));
    }

    @Test
    void apiStillNeedsAToken() throws Exception {
        mvc.perform(get("/api/orders/mine")).andExpect(status().isUnauthorized());
    }
}
