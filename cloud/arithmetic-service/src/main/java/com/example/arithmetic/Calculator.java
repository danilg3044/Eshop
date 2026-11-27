package com.example.arithmetic;

import java.math.BigDecimal;
import java.math.MathContext;

import org.springframework.stereotype.Service;

/** The arithmetic itself. BigDecimal, so 0.1 + 0.2 is exactly 0.3; division and powers use 16 significant digits. */
@Service
public class Calculator {

	static final int MAX_EXPONENT = 999;

	public BigDecimal add(BigDecimal a, BigDecimal b) {
		return a.add(b);
	}

	public BigDecimal subtract(BigDecimal a, BigDecimal b) {
		return a.subtract(b);
	}

	public BigDecimal multiply(BigDecimal a, BigDecimal b) {
		return a.multiply(b);
	}

	public BigDecimal divide(BigDecimal a, BigDecimal b) {
		if (b.signum() == 0) {
			throw new IllegalArgumentException("Division by zero");
		}
		return a.divide(b, MathContext.DECIMAL64);
	}

	public BigDecimal power(BigDecimal base, int exponent) {
		if (Math.abs(exponent) > MAX_EXPONENT) {
			throw new IllegalArgumentException("Exponent must be between -" + MAX_EXPONENT + " and " + MAX_EXPONENT);
		}
		if (exponent < 0 && base.signum() == 0) {
			throw new IllegalArgumentException("Zero cannot be raised to a negative power");
		}
		return base.pow(exponent, MathContext.DECIMAL64);
	}
}
