package com.example.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API gateway: the single public entry point (http://localhost:8090). Routes are declared in application.yml;
 * "lb://service-name" URIs are resolved through Eureka and load-balanced across all registered instances.
 */
@SpringBootApplication
public class GatewayApplication {

	public static void main(String[] args) {
		SpringApplication.run(GatewayApplication.class, args);
	}
}
