package com.example.strings;

import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.Size;

/**
 * GET /api/strings/{reverse|uppercase|lowercase|capitalize|length|word-count|palindrome}?text=..
 * The @Size limit is checked by Spring MVC's built-in method validation (too long -> 400).
 */
@RestController
@RequestMapping("/api/strings")
public class StringController {

	static final int MAX_LENGTH = 10_000;

	private final TextTools tools;
	private final String instanceId;

	public StringController(TextTools tools, @Value("${eureka.instance.instance-id}") String instanceId) {
		this.tools = tools;
		this.instanceId = instanceId;
	}

	@GetMapping("/reverse")
	public StringResult reverse(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("reverse", text, tools::reverse);
	}

	@GetMapping("/uppercase")
	public StringResult uppercase(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("uppercase", text, tools::uppercase);
	}

	@GetMapping("/lowercase")
	public StringResult lowercase(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("lowercase", text, tools::lowercase);
	}

	@GetMapping("/capitalize")
	public StringResult capitalize(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("capitalize", text, tools::capitalize);
	}

	@GetMapping("/length")
	public StringResult length(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("length", text, tools::length);
	}

	@GetMapping("/word-count")
	public StringResult wordCount(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("word-count", text, tools::wordCount);
	}

	@GetMapping("/palindrome")
	public StringResult palindrome(@RequestParam @Size(max = MAX_LENGTH) String text) {
		return apply("palindrome", text, tools::isPalindrome);
	}

	private StringResult apply(String operation, String text, Function<String, ?> function) {
		return new StringResult(operation, text, function.apply(text), instanceId);
	}
}
