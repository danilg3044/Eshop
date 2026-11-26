package com.example.eshop.admin;

import com.example.eshop.common.PageResponse;
import com.example.eshop.order.OrderDto;
import com.example.eshop.order.OrderService;
import com.example.eshop.order.OrderStatus;
import com.example.eshop.product.ProductDto;
import com.example.eshop.product.ProductService;
import com.example.eshop.user.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Back-office API. Protected twice: by the URL rule in SecurityConfig and by {@link PreAuthorize}
 * here, so moving the endpoints to another path can't accidentally expose them.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    public record StatusChange(@NotNull OrderStatus status) {}

    private final ProductService products;
    private final AdminUserService users;
    private final OrderService orders;

    public AdminController(ProductService products, AdminUserService users, OrderService orders) {
        this.products = products;
        this.users = users;
        this.orders = orders;
    }

    // ---- products (including inactive ones) ----

    @GetMapping("/products")
    public PageResponse<ProductDto> products(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) String category,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return products.search(q, category, false, page, size);
    }

    @GetMapping("/products/{id}")
    public ProductDto product(@PathVariable Long id) {
        return products.get(id, false);
    }

    // ---- users ----

    @GetMapping("/users")
    public PageResponse<AdminUserService.UserSummary> users(@RequestParam(required = false) String q,
                                                            @RequestParam(required = false) Role role,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "20") int size) {
        return users.search(q, role, page, size);
    }

    @GetMapping("/users/{id}")
    public AdminUserService.UserDetail user(@PathVariable Long id) {
        return users.get(id);
    }

    // ---- orders ----

    @GetMapping("/orders")
    public PageResponse<OrderDto> orders(@RequestParam(defaultValue = "CURRENT") OrderService.Scope scope,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return orders.search(scope, page, size);
    }

    @GetMapping("/orders/{id}")
    public OrderDto order(@PathVariable Long id) {
        return orders.get(id);
    }

    @PatchMapping("/orders/{id}/status")
    public OrderDto changeStatus(@PathVariable Long id, @Valid @RequestBody StatusChange body) {
        return orders.changeStatus(id, body.status());
    }
}
