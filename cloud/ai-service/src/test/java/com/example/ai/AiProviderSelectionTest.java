package com.example.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** The whole application starts with each AI_PROVIDER setting, and picks the right chat model (no network). */
class AiProviderSelectionTest {

	@Nested
	@SpringBootTest(properties = { "eureka.client.enabled=false", "spring.ai.model.chat=none" })
	class WithoutProvider {

		@Autowired ObjectProvider<ChatModel> chatModel;

		@Test
		void startsWithoutAChatModel() {
			assertThat(chatModel.getIfAvailable()).isNull();
		}
	}

	@Nested
	@SpringBootTest(properties = { "eureka.client.enabled=false", "spring.ai.model.chat=anthropic",
			"spring.ai.anthropic.api-key=test-key-not-used" })
	class WithAnthropic {

		@Autowired ChatModel chatModel;

		@Test
		void usesClaude() {
			assertThat(chatModel).isInstanceOf(AnthropicChatModel.class);
		}
	}
}
