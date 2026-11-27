package com.example.arithmetic;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ArithmeticController.class)
@Import(Calculator.class)
class ArithmeticControllerTest {

	@Autowired
	MockMvc mvc;

	@Test
	void addsTwoNumbers() throws Exception {
		mvc.perform(get("/api/arithmetic/add").param("a", "2.5").param("b", "4"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.operation").value("add"))
				.andExpect(jsonPath("$.result").value(6.5))
				.andExpect(jsonPath("$.servedBy").value("arithmetic-service:8081"));
	}

	@Test
	void raisesToAPower() throws Exception {
		mvc.perform(get("/api/arithmetic/power").param("base", "3").param("exponent", "3"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.result").value(27));
	}

	@Test
	void divisionByZeroIsABadRequest() throws Exception {
		mvc.perform(get("/api/arithmetic/divide").param("a", "1").param("b", "0"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Division by zero"));
	}

	@Test
	void missingOrNonNumericParametersAreBadRequests() throws Exception {
		mvc.perform(get("/api/arithmetic/multiply").param("a", "2")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/arithmetic/subtract").param("a", "x").param("b", "1")).andExpect(status().isBadRequest());
	}
}
