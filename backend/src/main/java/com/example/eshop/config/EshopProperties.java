package com.example.eshop.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code eshop.*} settings in application.yml. */
@ConfigurationProperties(prefix = "eshop")
public record EshopProperties(String frontendUrl) {
}
