package com.example.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring AI microservice (:8084), registered in Eureka as "ai-service" and reached through the gateway at
 * /api/ai/**. It writes product descriptions with whichever chat model AI_PROVIDER selects: Anthropic Claude,
 * a local Ollama model, or none (then it answers 503 and the rest of the system works as before).
 */
@SpringBootApplication
public class AiServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(AiServiceApplication.class, args);
	}
}
