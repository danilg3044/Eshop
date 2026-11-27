package com.example.arithmetic;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/arithmetic/{add|subtract|multiply|divide}?a=..&b=..  and  /power?base=..&exponent=.. */
@RestController
@RequestMapping("/api/arithmetic")
public class ArithmeticController {

	private final Calculator calculator;
	private final String instanceId;

	public ArithmeticController(Calculator calculator, @Value("${eureka.instance.instance-id}") String instanceId) {
		this.calculator = calculator;
		this.instanceId = instanceId;
	}

	@GetMapping("/add")
	public CalculationResult add(@RequestParam BigDecimal a, @RequestParam BigDecimal b) {
		return result("add", a, b, calculator.add(a, b));
	}

	@GetMapping("/subtract")
	public CalculationResult subtract(@RequestParam BigDecimal a, @RequestParam BigDecimal b) {
		return result("subtract", a, b, calculator.subtract(a, b));
	}

	@GetMapping("/multiply")
	public CalculationResult multiply(@RequestParam BigDecimal a, @RequestParam BigDecimal b) {
		return result("multiply", a, b, calculator.multiply(a, b));
	}

	@GetMapping("/divide")
	public CalculationResult divide(@RequestParam BigDecimal a, @RequestParam BigDecimal b) {
		return result("divide", a, b, calculator.divide(a, b));
	}

	@GetMapping("/power")
	public CalculationResult power(@RequestParam BigDecimal base, @RequestParam int exponent) {
		return result("power", base, BigDecimal.valueOf(exponent), calculator.power(base, exponent));
	}

	private CalculationResult result(String operation, BigDecimal a, BigDecimal b, BigDecimal value) {
		return new CalculationResult(operation, a, b, value, instanceId);
	}
}
