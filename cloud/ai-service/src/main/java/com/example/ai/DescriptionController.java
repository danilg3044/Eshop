package com.example.ai;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ai.DescriptionWriter.AiProviderException;
import com.example.ai.DescriptionWriter.AiUnavailableException;

import jakarta.validation.Valid;

/** POST /api/ai/product-descriptions (admins only, see SecurityConfig). Suggests; the admin decides what to save. */
@RestController
@RequestMapping("/api/ai")
public class DescriptionController {

	private final DescriptionWriter writer;

	public DescriptionController(DescriptionWriter writer) {
		this.writer = writer;
	}

	@PostMapping("/product-descriptions")
	public DescriptionSuggestion describe(@Valid @RequestBody DescriptionRequest request) {
		return writer.write(request);
	}

	@ExceptionHandler(AiUnavailableException.class)
	ProblemDetail unavailable(AiUnavailableException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
	}

	@ExceptionHandler(AiProviderException.class)
	ProblemDetail providerFailed(AiProviderException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, ex.getMessage());
	}
}
