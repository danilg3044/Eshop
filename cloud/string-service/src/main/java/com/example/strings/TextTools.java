package com.example.strings;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

/** The string operations. All are Unicode-aware: they work on code points, so emoji and accented letters survive. */
@Service
public class TextTools {

	public String reverse(String text) {
		return new StringBuilder(text).reverse().toString(); // keeps surrogate pairs (emoji) intact
	}

	public String uppercase(String text) {
		return text.toUpperCase(Locale.ROOT);
	}

	public String lowercase(String text) {
		return text.toLowerCase(Locale.ROOT);
	}

	/** "hello WORLD" -> "Hello World". Whitespace between words is kept as it was. */
	public String capitalize(String text) {
		return Arrays.stream(text.split("(?<=\\s)|(?=\\s)"))
				.map(part -> part.isBlank() ? part : capitalizeWord(part))
				.collect(Collectors.joining());
	}

	/** Number of characters as a person counts them (code points), not UTF-16 units. */
	public int length(String text) {
		return text.codePointCount(0, text.length());
	}

	public int wordCount(String text) {
		String trimmed = text.strip();
		return trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;
	}

	/** Ignores case, spaces and punctuation: "A man, a plan, a canal: Panama" is a palindrome. */
	public boolean isPalindrome(String text) {
		String letters = text.codePoints()
				.filter(Character::isLetterOrDigit)
				.map(Character::toLowerCase)
				.collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
				.toString();
		return letters.equals(reverse(letters));
	}

	private static String capitalizeWord(String word) {
		int first = word.codePointAt(0);
		return new StringBuilder()
				.appendCodePoint(Character.toTitleCase(first))
				.append(word.substring(Character.charCount(first)).toLowerCase(Locale.ROOT))
				.toString();
	}
}
