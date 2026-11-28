package com.example.eshop.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed view of the {@code eshop.*} settings in application.yml.
 *
 * @param frontendUrl  the Angular dev server's origin (allowed by CORS)
 * @param frontendDir  folder with the built Angular app, served at /eshop/ (see {@link FrontendConfig}); skipped if missing
 * @param aiServiceUrl cloud/ai-service, where /api/ai/** is forwarded to
 */
@ConfigurationProperties(prefix = "eshop")
public record EshopProperties(String frontendUrl, String frontendDir, String aiServiceUrl) {
}
