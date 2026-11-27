package com.example.arithmetic;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Arithmetic microservice. Registers in Eureka as "arithmetic-service"; reached through the gateway at /api/arithmetic/**. */
@SpringBootApplication
public class ArithmeticServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ArithmeticServiceApplication.class, args);
	}
}
