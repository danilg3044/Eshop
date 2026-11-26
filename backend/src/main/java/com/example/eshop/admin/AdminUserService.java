package com.example.eshop.admin;

import com.example.eshop.common.NotFoundException;
import com.example.eshop.common.PageResponse;
import com.example.eshop.order.OrderDto;
import com.example.eshop.order.OrderRepository;
import com.example.eshop.order.OrderService;
import com.example.eshop.user.Role;
import com.example.eshop.user.UserDto;
import com.example.eshop.user.UserRepository;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class AdminUserService {

    public record UserSummary(UserDto user, long orderCount) {}

    public record UserDetail(UserDto user, List<OrderDto> orders) {}

    private final UserRepository users;
    private final OrderRepository orders;
    private final OrderService orderService;

    public AdminUserService(UserRepository users, OrderRepository orders, OrderService orderService) {
        this.users = users;
        this.orders = orders;
        this.orderService = orderService;
    }

    public PageResponse<UserSummary> search(String q, Role role, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100), Sort.by("email"));
        var result = users.search(role, StringUtils.hasText(q) ? q.trim() : null, pageable);
        return PageResponse.of(result, u -> new UserSummary(UserDto.from(u), orders.countByUserId(u.getId())));
    }

    public UserDetail get(Long id) {
        var user = users.findById(id).orElseThrow(() -> new NotFoundException("User %d not found".formatted(id)));
        return new UserDetail(UserDto.from(user), orderService.forUser(id));
    }
}
