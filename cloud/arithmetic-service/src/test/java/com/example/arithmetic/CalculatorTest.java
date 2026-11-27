package com.example.arithmetic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class CalculatorTest {

	private final Calculator calculator = new Calculator();

	private static BigDecimal n(String value) {
		return new BigDecimal(value);
	}

	@Test
	void addsExactlyWithoutFloatingPointNoise() {
		assertThat(calculator.add(n("0.1"), n("0.2"))).isEqualByComparingTo("0.3");
	}

	@Test
	void subtractsAndMultiplies() {
		assertThat(calculator.subtract(n("5"), n("7.5"))).isEqualByComparingTo("-2.5");
		assertThat(calculator.multiply(n("1.5"), n("-4"))).isEqualByComparingTo("-6");
	}

	@Test
	void dividesWith16SignificantDigits() {
		assertThat(calculator.divide(n("10"), n("4"))).isEqualByComparingTo("2.5");
		assertThat(calculator.divide(n("1"), n("3"))).isEqualByComparingTo("0.3333333333333333");
	}

	@Test
	void rejectsDivisionByZero() {
		assertThatIllegalArgumentException().isThrownBy(() -> calculator.divide(n("1"), n("0.00")))
				.withMessage("Division by zero");
	}

	@Test
	void raisesToIntegerPowers() {
		assertThat(calculator.power(n("2"), 10)).isEqualByComparingTo("1024");
		assertThat(calculator.power(n("2"), -2)).isEqualByComparingTo("0.25");
		assertThat(calculator.power(n("7"), 0)).isEqualByComparingTo("1");
	}

	@Test
	void rejectsOutOfRangeAndUndefinedPowers() {
		assertThatIllegalArgumentException().isThrownBy(() -> calculator.power(n("2"), 1000));
		assertThatIllegalArgumentException().isThrownBy(() -> calculator.power(n("0"), -1));
	}
}
