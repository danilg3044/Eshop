package com.example.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * Writes product descriptions with a chat model. Which model is decided by configuration only
 * (spring.ai.model.chat = AI_PROVIDER): this class talks to Spring AI's provider-neutral {@link ChatClient}.
 */
@Service
public class DescriptionWriter {

	/** No chat model configured (AI_PROVIDER=none, the default). */
	public static class AiUnavailableException extends RuntimeException {
		public AiUnavailableException(String message) {
			super(message);
		}
	}

	/** The provider was reached but failed (wrong API key, model not pulled, rate limit...). */
	public static class AiProviderException extends RuntimeException {
		public AiProviderException(String message, Throwable cause) {
			super(message, cause);
		}
	}

	static final String SYSTEM_PROMPT = """
			You write product descriptions for EShop, an online store.
			Write 40 to 80 words of plain text in English: warm, concrete and honest.
			Use only the facts you are given. Do not invent sizes, materials, prices, certifications or claims.
			No markdown, no emojis, no exclamation marks.
			Also list exactly 3 highlights of at most 6 words each.
			""";

	static final String USER_PROMPT = """
			Product name: {name}
			Category: {category}
			Keywords from the store owner: {keywords}
			Current description (improve it, or ignore it if it is empty): {current}
			""";

	private final ChatClient chatClient;

	public DescriptionWriter(ObjectProvider<ChatModel> chatModel) {
		ChatModel model = chatModel.getIfAvailable();
		this.chatClient = model == null ? null : ChatClient.builder(model).defaultSystem(SYSTEM_PROMPT).build();
	}

	public DescriptionSuggestion write(DescriptionRequest request) {
		if (chatClient == null) {
			throw new AiUnavailableException("No AI provider is configured. Start the AI service with "
					+ "AI_PROVIDER=anthropic and ANTHROPIC_API_KEY, or with AI_PROVIDER=ollama.");
		}
		DescriptionSuggestion suggestion;
		try {
			suggestion = chatClient.prompt()
					.user(user -> user.text(USER_PROMPT)
							.param("name", request.name())
							.param("category", orNone(request.category()))
							.param("keywords", request.keywordsOrEmpty().isEmpty() ? "(none)"
									: String.join(", ", request.keywordsOrEmpty()))
							.param("current", orNone(request.currentDescription())))
					.call()
					.entity(DescriptionSuggestion.class);
		} catch (RuntimeException ex) {
			throw new AiProviderException("The AI provider failed: " + ex.getMessage(), ex);
		}
		if (suggestion == null || suggestion.description() == null || suggestion.description().isBlank()) {
			throw new AiProviderException("The AI provider returned no description", null);
		}
		return suggestion;
	}

	private static String orNone(String value) {
		return value == null || value.isBlank() ? "(none)" : value.strip();
	}
}
