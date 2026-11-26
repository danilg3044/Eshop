package com.example.eshop.order;

import com.example.eshop.common.BusinessException;
import com.example.eshop.common.NotFoundException;
import com.example.eshop.common.PageResponse;
import com.example.eshop.product.Product;
import com.example.eshop.product.ProductRepository;
import com.example.eshop.user.AppUser;
import com.example.eshop.user.UserRepository;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderService {

    /** Which orders the admin screen asks for. */
    public enum Scope { CURRENT, HISTORY, ALL }

    private final OrderRepository orders;
    private final ProductRepository products;
    private final UserRepository users;

    public OrderService(OrderRepository orders, ProductRepository products, UserRepository users) {
        this.orders = orders;
        this.products = products;
        this.users = users;
    }

    /**
     * Places an order for the user. Products are row-locked while stock is checked and decremented,
     * so two concurrent orders can't both buy the last item.
     */
    public OrderDto place(Long userId, PlaceOrderRequest request) {
        AppUser user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));

        // The same product may appear on several lines; add their quantities together.
        Map<Long, Integer> quantities = request.items().stream()
                .collect(Collectors.toMap(PlaceOrderRequest.Line::productId, PlaceOrderRequest.Line::quantity,
                        Integer::sum, LinkedHashMap::new));

        Map<Long, Product> found = products.findAllForUpdate(quantities.keySet()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        Order order = new Order(user, request.shipping());
        quantities.forEach((productId, qty) -> {
            Product product = found.get(productId);
            if (product == null || !product.isActive()) {
                throw new BusinessException("Product %d is not available".formatted(productId));
            }
            order.addItem(product, qty);
        });
        return OrderDto.from(orders.save(order));
    }

    @Transactional(readOnly = true)
    public List<OrderDto> forUser(Long userId) {
        return orders.findByUserIdOrderByCreatedAtDesc(userId).stream().map(OrderDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDto> search(Scope scope, int page, int size) {
        Set<OrderStatus> statuses = switch (scope) {
            case CURRENT -> OrderStatus.CURRENT;
            case HISTORY -> OrderStatus.HISTORY;
            case ALL -> EnumSet.allOf(OrderStatus.class);
        };
        var pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(orders.findByStatusIn(statuses, pageable), OrderDto::from);
    }

    @Transactional(readOnly = true)
    public OrderDto get(Long id) {
        return OrderDto.from(load(id));
    }

    public OrderDto changeStatus(Long id, OrderStatus next) {
        Order order = load(id);
        order.changeStatus(next);
        return OrderDto.from(order);
    }

    private Order load(Long id) {
        return orders.findById(id).orElseThrow(() -> new NotFoundException("Order %d not found".formatted(id)));
    }
}
