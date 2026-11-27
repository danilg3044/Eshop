package com.example.ai;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.example.ai.DescriptionWriter.AiProviderException;
import com.example.ai.DescriptionWriter.AiUnavailableException;

@WebMvcTest(DescriptionController.class)
@Import(SecurityConfig.class)
class DescriptionControllerTest {

	@Autowired MockMvc mvc;

	@MockitoBean DescriptionWriter writer;

	private static MockHttpServletRequestBuilder describe(String body) {
		return post("/api/ai/product-descriptions").contentType(MediaType.APPLICATION_JSON).content(body);
	}

	private static final String MUG = "{\"name\":\"Ceramic Mug Set\",\"category\":\"Home\",\"keywords\":[\"hand-glazed\"]}";

	@Test
	void adminsGetASuggestion() throws Exception {
		when(writer.write(any())).thenReturn(new DescriptionSuggestion("Four mugs.", List.of("Hand-glazed")));

		mvc.perform(describe(MUG).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.description").value("Four mugs."))
				.andExpect(jsonPath("$.highlights[0]").value("Hand-glazed"));
	}

	@Test
	void onlyAdminsMayUseIt() throws Exception {
		mvc.perform(describe(MUG)).andExpect(status().isUnauthorized());
		mvc.perform(describe(MUG).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))))
				.andExpect(status().isForbidden());
	}

	@Test
	void validatesTheRequest() throws Exception {
		mvc.perform(describe("{\"name\":\" \"}").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
				.andExpect(status().isBadRequest());
	}

	@Test
	void reports503WithoutAProviderAnd502WhenItFails() throws Exception {
		var admin = jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));

		doThrow(new AiUnavailableException("No AI provider is configured")).when(writer).write(any());
		mvc.perform(describe(MUG).with(admin))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.detail").value("No AI provider is configured"));

		doThrow(new AiProviderException("The AI provider failed: timeout", null)).when(writer).write(any());
		mvc.perform(describe(MUG).with(admin)).andExpect(status().isBadGateway());
	}
}
