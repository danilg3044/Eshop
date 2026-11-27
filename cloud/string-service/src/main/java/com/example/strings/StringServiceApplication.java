package com.example.strings;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** String manipulation microservice. Registers in Eureka as "string-service"; reached through the gateway at /api/strings/**. */
@SpringBootApplication
public class StringServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(StringServiceApplication.class, args);
	}
}
