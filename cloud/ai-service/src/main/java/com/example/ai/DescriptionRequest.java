package com.example.ai;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** What the admin knows about the product. Limits keep prompts (and cost) small. */
public record DescriptionRequest(
		@NotBlank @Size(max = 200) String name,
		@Size(max = 100) String category,
		@Size(max = 10) List<@NotBlank @Size(max = 40) String> keywords,
		@Size(max = 2000) String currentDescription) {

	public List<String> keywordsOrEmpty() {
		return keywords == null ? List.of() : keywords;
	}
}
