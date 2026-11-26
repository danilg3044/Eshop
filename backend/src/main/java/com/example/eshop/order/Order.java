package com.example.eshop.order;

import com.example.eshop.common.BusinessException;
import com.example.eshop.product.Product;
import com.example.eshop.user.AppUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.hibernate.annotations.BatchSize;

@Entity
@Table(name = "orders") // "order" is a reserved word in SQL
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Embedded
    private ShippingAddress shipping;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50) // avoids N+1 queries when listing many orders
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {
        // for JPA
    }

    public Order(AppUser user, ShippingAddress shipping) {
        this.user = user;
        this.shipping = shipping;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    /** Adds a line, taking the items out of the product's stock. */
    public void addItem(Product product, int quantity) {
        product.decreaseStock(quantity);
        OrderItem item = new OrderItem(this, product, quantity);
        items.add(item);
        total = total.add(item.lineTotal());
    }

    /** Moves the order along its lifecycle. Cancelling puts the items back in stock. */
    public void changeStatus(OrderStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new BusinessException("Cannot change order %d from %s to %s".formatted(id, status, next));
        }
        if (next == OrderStatus.CANCELLED) {
            items.forEach(i -> i.getProduct().increaseStock(i.getQuantity()));
        }
        status = next;
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public OrderStatus getStatus() { return status; }
    public BigDecimal getTotal() { return total; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public ShippingAddress getShipping() { return shipping; }
    public List<OrderItem> getItems() { return Collections.unmodifiableList(items); }
}
