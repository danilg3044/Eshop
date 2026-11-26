package com.example.eshop.product;

import com.example.eshop.common.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private int stock;

    private String imageUrl;

    /** Inactive products are hidden from customers but still visible to admins. */
    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private Instant createdAt;

    protected Product() {
        // for JPA
    }

    public Product(String sku, String name, String category, BigDecimal price, int stock) {
        this.sku = sku;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stock = stock;
        this.createdAt = Instant.now();
    }

    /** Takes items out of stock; fails if there are not enough. */
    public void decreaseStock(int quantity) {
        if (quantity > stock) {
            throw new BusinessException("Not enough stock for '%s': requested %d, available %d"
                    .formatted(name, quantity, stock));
        }
        stock -= quantity;
    }

    public void increaseStock(int quantity) {
        stock += quantity;
    }

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public BigDecimal getPrice() { return price; }
    public int getStock() { return stock; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
}
