package com.example.eshop.ai;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/** ai-service could not be reached: a 503 ProblemDetail, like the shop's other errors. */
class AiServiceDownException extends ErrorResponseException {

    AiServiceDownException(String detail) {
        super(HttpStatus.SERVICE_UNAVAILABLE, ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, detail), null);
    }
}
