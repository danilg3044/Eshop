package com.example.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

import com.example.ai.DescriptionWriter.AiProviderException;
import com.example.ai.DescriptionWriter.AiUnavailableException;

/** The writer against a fake chat model: what goes into the prompt, and how the reply becomes Java data. */
class DescriptionWriterTest {

	/** Records the prompt and answers with whatever the test wants, like a real model would (as text). */
	static class FakeChatModel implements ChatModel {
		Prompt lastPrompt;
		private final Function<Prompt, String> reply;

		FakeChatModel(Function<Prompt, String> reply) {
			this.reply = reply;
		}

		@Override
		public ChatResponse call(Prompt prompt) {
			this.lastPrompt = prompt;
			return new ChatResponse(List.of(new Generation(new AssistantMessage(reply.apply(prompt)))));
		}
	}

	private static DescriptionWriter writerWith(ChatModel model) {
		var beans = model == null ? new StaticListableBeanFactory() : new StaticListableBeanFactory(Map.of("chatModel", model));
		return new DescriptionWriter(beans.getBeanProvider(ChatModel.class));
	}

	private static final DescriptionRequest MUG = new DescriptionRequest(
			"Ceramic Mug Set", "Home", List.of("hand-glazed", "set of 4"), null);

	@Test
	void turnsTheModelsJsonReplyIntoTypedData() {
		var model = new FakeChatModel(prompt -> """
				{"description": "Four hand-glazed ceramic mugs for slow mornings.",
				 "highlights": ["Hand-glazed finish", "Set of four", "Everyday sturdy"]}
				""");

		DescriptionSuggestion suggestion = writerWith(model).write(MUG);

		assertThat(suggestion.description()).isEqualTo("Four hand-glazed ceramic mugs for slow mornings.");
		assertThat(suggestion.highlights()).containsExactly("Hand-glazed finish", "Set of four", "Everyday sturdy");
	}

	@Test
	void sendsTheProductFactsTheRulesAndTheExpectedJsonFormat() {
		var model = new FakeChatModel(prompt -> "{\"description\": \"x\", \"highlights\": []}");

		writerWith(model).write(MUG);

		String sent = model.lastPrompt.getContents();
		assertThat(sent).contains("Ceramic Mug Set", "Home", "hand-glazed, set of 4", "Current description");
		assertThat(sent).contains("Use only the facts you are given"); // system prompt
		assertThat(sent).contains("highlights"); // structured output: the JSON schema of DescriptionSuggestion
	}

	@Test
	void withoutAConfiguredModelExplainsHowToEnableOne() {
		assertThatThrownBy(() -> writerWith(null).write(MUG))
				.isInstanceOf(AiUnavailableException.class)
				.hasMessageContaining("AI_PROVIDER");
	}

	@Test
	void providerErrorsAndEmptyAnswersAreReportedAsProviderFailures() {
		var failing = new FakeChatModel(prompt -> {
			throw new IllegalStateException("invalid x-api-key");
		});
		assertThatThrownBy(() -> writerWith(failing).write(MUG))
				.isInstanceOf(AiProviderException.class)
				.hasMessageContaining("invalid x-api-key");

		var empty = new FakeChatModel(prompt -> "{\"description\": \" \", \"highlights\": []}");
		assertThatThrownBy(() -> writerWith(empty).write(MUG)).isInstanceOf(AiProviderException.class);
	}
}
