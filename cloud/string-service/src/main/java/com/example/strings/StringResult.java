package com.example.strings;

/**
 * result is a string, number or boolean depending on the operation.
 * servedBy names the instance that answered, so load balancing through the gateway is visible.
 */
public record StringResult(String operation, String input, Object result, String servedBy) {
}
