package com.example.eshop.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderDto(
        Long id,
        Long userId,
        String userEmail,
        OrderStatus status,
        BigDecimal total,
        Instant createdAt,
        Instant updatedAt,
        ShippingAddress shipping,
        List<Item> items) {

    public record Item(Long productId, String productName, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}

    /** Must be called inside a transaction: it reads the lazy user and items. */
    public static OrderDto from(Order o) {
        return new OrderDto(o.getId(), o.getUser().getId(), o.getUser().getEmail(), o.getStatus(), o.getTotal(),
                o.getCreatedAt(), o.getUpdatedAt(), o.getShipping(),
                o.getItems().stream()
                        .map(i -> new Item(i.getProduct().getId(), i.getProductName(), i.getUnitPrice(),
                                i.getQuantity(), i.lineTotal()))
                        .toList());
    }
}
