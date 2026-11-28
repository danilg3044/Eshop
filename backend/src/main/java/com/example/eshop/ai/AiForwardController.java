package com.example.eshop.ai;

import com.example.eshop.config.EshopProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * Passes /api/ai/** on to cloud/ai-service ({@code eshop.ai-service-url}, env {@code AI_SERVICE_URL}).
 * <p>
 * Needed when this backend serves the Angular app itself (/eshop/): the app calls /api/ai/... on its own origin, and
 * nothing else routes it (the dev server's proxy and the gateway do that in the other setups). The caller's
 * {@code Authorization} header goes along unchanged and ai-service checks it (admins only); this class only requires
 * a valid token, through the normal /api/** rule. ai-service's answer, errors included, comes back as it is.
 */
@RestController
public class AiForwardController {

    private final String aiServiceUrl;
    private final RestClient aiService;

    public AiForwardController(EshopProperties props) {
        this.aiServiceUrl = props.aiServiceUrl();
        this.aiService = RestClient.builder().baseUrl(props.aiServiceUrl()).build();
    }

    @RequestMapping("/api/ai/**")
    ResponseEntity<byte[]> forward(HttpServletRequest request, @AuthenticationPrincipal Jwt token,
            @RequestBody(required = false) byte[] body) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String query = request.getQueryString();
        try {
            var spec = aiService.method(HttpMethod.valueOf(request.getMethod()))
                    .uri(query == null ? path : path + "?" + query)
                    .headers(h -> {
                        copy(request, h, HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT);
                        h.setBearerAuth(token.getTokenValue()); // the caller's (already validated) token
                    });
            if (body != null) {
                spec.body(body);
            }
            return spec.exchange((req, res) -> {
                var headers = new HttpHeaders();
                if (res.getHeaders().getContentType() != null) {
                    headers.setContentType(res.getHeaders().getContentType());
                }
                return new ResponseEntity<>(res.getBody().readAllBytes(), headers, res.getStatusCode());
            });
        } catch (ResourceAccessException e) {
            throw new AiServiceDownException("The AI service is not reachable at " + aiServiceUrl
                    + ". Start cloud/ai-service (or set AI_SERVICE_URL).");
        }
    }

    private static void copy(HttpServletRequest from, HttpHeaders to, String... names) {
        for (String name : names) {
            String value = from.getHeader(name);
            if (value != null) {
                to.set(name, value);
            }
        }
    }
}
