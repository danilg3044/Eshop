package com.example.eshop.order;

import static com.example.eshop.order.OrderStatus.CANCELLED;
import static com.example.eshop.order.OrderStatus.DELIVERED;
import static com.example.eshop.order.OrderStatus.PAID;
import static com.example.eshop.order.OrderStatus.PENDING;
import static com.example.eshop.order.OrderStatus.SHIPPED;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

class OrderStatusTest {

    @ParameterizedTest(name = "{0} -> {1} allowed={2}")
    @CsvSource({
            "PENDING, PAID, true",
            "PENDING, CANCELLED, true",
            "PENDING, SHIPPED, false",
            "PAID, SHIPPED, true",
            "PAID, CANCELLED, true",
            "PAID, PENDING, false",
            "SHIPPED, DELIVERED, true",
            "SHIPPED, CANCELLED, false",
            "DELIVERED, CANCELLED, false",
            "CANCELLED, PENDING, false"
    })
    void transitions(OrderStatus from, OrderStatus to, boolean allowed) {
        assertThat(from.canTransitionTo(to)).isEqualTo(allowed);
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    void everyStatusIsEitherCurrentOrHistory(OrderStatus status) {
        assertThat(OrderStatus.CURRENT.contains(status)).isNotEqualTo(OrderStatus.HISTORY.contains(status));
        assertThat(status.isTerminal()).isEqualTo(status == DELIVERED || status == CANCELLED);
        assertThat(OrderStatus.CURRENT).containsExactlyInAnyOrder(PENDING, PAID, SHIPPED);
    }
}
