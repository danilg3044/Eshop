package com.example.eshop.product;

import java.math.BigDecimal;

public record ProductDto(
        Long id,
        String sku,
        String name,
        String description,
        String category,
        BigDecimal price,
        int stock,
        String imageUrl,
        boolean active) {

    public static ProductDto from(Product p) {
        return new ProductDto(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getCategory(),
                p.getPrice(), p.getStock(), p.getImageUrl(), p.isActive());
    }
}
