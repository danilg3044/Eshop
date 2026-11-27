package com.example.arithmetic;

import java.math.BigDecimal;

/** servedBy names the instance that answered, so load balancing through the gateway is visible. */
public record CalculationResult(String operation, BigDecimal a, BigDecimal b, BigDecimal result, String servedBy) {
}
