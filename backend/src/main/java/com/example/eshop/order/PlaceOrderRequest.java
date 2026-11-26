package com.example.eshop.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PlaceOrderRequest(
        @NotEmpty @Valid List<Line> items,
        @NotNull @Valid ShippingAddress shipping) {

    public record Line(@NotNull Long productId, @Min(1) @Max(100) int quantity) {}
}
