package com.example.strings;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StringController.class)
@Import({ TextTools.class, SecurityConfig.class })
class StringControllerTest {

	@Autowired
	MockMvc mvc;

	@Test
	void callsWithoutATokenAreRejected() throws Exception {
		mvc.perform(get("/api/strings/reverse").param("text", "abc")).andExpect(status().isUnauthorized());
	}

	@Test
	void reversesText() throws Exception {
		mvc.perform(get("/api/strings/reverse").param("text", "gateway").with(jwt()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.operation").value("reverse"))
				.andExpect(jsonPath("$.input").value("gateway"))
				.andExpect(jsonPath("$.result").value("yawetag"))
				.andExpect(jsonPath("$.servedBy").value("string-service:8082"));
	}

	@Test
	void returnsNumbersAndBooleansAsJsonTypes() throws Exception {
		mvc.perform(get("/api/strings/word-count").param("text", "one two three").with(jwt()))
				.andExpect(jsonPath("$.result").value(3));
		mvc.perform(get("/api/strings/palindrome").param("text", "Never odd or even").with(jwt()))
				.andExpect(jsonPath("$.result").value(true));
	}

	@Test
	void missingTextIsABadRequest() throws Exception {
		mvc.perform(get("/api/strings/uppercase").with(jwt())).andExpect(status().isBadRequest());
	}

	@Test
	void tooLongTextIsABadRequest() throws Exception {
		mvc.perform(get("/api/strings/length").param("text", "x".repeat(StringController.MAX_LENGTH + 1)).with(jwt()))
				.andExpect(status().isBadRequest());
	}
}
