package com.example.strings;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextToolsTest {

	private final TextTools tools = new TextTools();

	@Test
	void reversesKeepingEmojiIntact() {
		assertThat(tools.reverse("abc")).isEqualTo("cba");
		assertThat(tools.reverse("hi😀")).isEqualTo("😀ih");
	}

	@Test
	void changesCase() {
		assertThat(tools.uppercase("Grüße")).isEqualTo("GRÜSSE");
		assertThat(tools.lowercase("HeLLo")).isEqualTo("hello");
	}

	@Test
	void capitalizesEachWordAndKeepsWhitespace() {
		assertThat(tools.capitalize("hello  WORLD\tagain")).isEqualTo("Hello  World\tAgain");
		assertThat(tools.capitalize("")).isEmpty();
	}

	@Test
	void countsCharactersAsPeopleDo() {
		assertThat(tools.length("héllo")).isEqualTo(5);
		assertThat(tools.length("😀")).isEqualTo(1); // two UTF-16 chars, one character
	}

	@Test
	void countsWords() {
		assertThat(tools.wordCount("  the quick\nbrown   fox ")).isEqualTo(4);
		assertThat(tools.wordCount("   ")).isZero();
	}

	@Test
	void detectsPalindromesIgnoringCaseAndPunctuation() {
		assertThat(tools.isPalindrome("A man, a plan, a canal: Panama")).isTrue();
		assertThat(tools.isPalindrome("hello")).isFalse();
	}
}
