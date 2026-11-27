package com.example.ai;

import java.util.List;

/**
 * The model's answer as typed Java data. Spring AI's structured output describes this record to the model as a
 * JSON schema and converts the reply back into it (ChatClient ... .entity(DescriptionSuggestion.class)).
 *
 * @param description plain text, ready to store as the product's description
 * @param highlights  a few short selling points the admin can reuse
 */
public record DescriptionSuggestion(String description, List<String> highlights) {
}
