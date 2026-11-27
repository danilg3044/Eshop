package com.example.arithmetic;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Invalid input (division by zero, huge exponent) becomes a 400 ProblemDetail instead of a 500. */
@RestControllerAdvice
public class ErrorHandler {

	@ExceptionHandler(IllegalArgumentException.class)
	ProblemDetail badInput(IllegalArgumentException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
	}
}
