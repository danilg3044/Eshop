package com.example.eshop.order;

import java.util.EnumSet;
import java.util.Set;

/**
 * Order lifecycle:
 * <pre>
 * PENDING ─► PAID ─► SHIPPED ─► DELIVERED
 *    │         │
 *    └────►────┴──► CANCELLED
 * </pre>
 * DELIVERED and CANCELLED are terminal ("history"); the rest are "current" orders.
 */
public enum OrderStatus {
    PENDING,
    PAID,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    public static final Set<OrderStatus> CURRENT = EnumSet.of(PENDING, PAID, SHIPPED);
    public static final Set<OrderStatus> HISTORY = EnumSet.of(DELIVERED, CANCELLED);

    public boolean isTerminal() {
        return HISTORY.contains(this);
    }

    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PENDING -> next == PAID || next == CANCELLED;
            case PAID -> next == SHIPPED || next == CANCELLED;
            case SHIPPED -> next == DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }
}
