package com.example.eshop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.eshop.common.BusinessException;
import com.example.eshop.product.Product;
import com.example.eshop.product.ProductRepository;
import com.example.eshop.user.AppUser;
import com.example.eshop.user.AuthProvider;
import com.example.eshop.user.Role;
import com.example.eshop.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** Pure unit test: repositories are mocked, no Spring context and no database. */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository orders;
    @Mock ProductRepository products;
    @Mock UserRepository users;
    @InjectMocks OrderService service;

    AppUser customer;
    Product mug;
    Product lamp;
    ShippingAddress address = new ShippingAddress("Dana Cohen", "1 Main St", "Tel Aviv", "61000", "Israel");

    @BeforeEach
    void setUp() {
        customer = withId(new AppUser("101", "dana@example.com", Role.USER, AuthProvider.LOCAL), 7L);
        mug = withId(new Product("HOME-002", "Mug", "Home", new BigDecimal("10.00"), 5), 1L);
        lamp = withId(new Product("HOME-003", "Lamp", "Home", new BigDecimal("45.50"), 2), 2L);
        // lenient: only the place-order tests look the user up
        lenient().when(users.findById(7L)).thenReturn(Optional.of(customer));
    }

    @Test
    void placeOrder_computesTotal_decrementsStock_andMergesDuplicateLines() {
        when(products.findAllForUpdate(anyCollection())).thenReturn(List.of(mug, lamp));
        when(orders.save(any(Order.class))).thenAnswer(inv -> withId(inv.getArgument(0), 100L));

        var request = new PlaceOrderRequest(List.of(
                new PlaceOrderRequest.Line(1L, 2),
                new PlaceOrderRequest.Line(2L, 1),
                new PlaceOrderRequest.Line(1L, 1)), address);

        OrderDto result = service.place(7L, request);

        assertThat(result.total()).isEqualByComparingTo("75.50"); // 3 x 10.00 + 45.50
        assertThat(result.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(result.items()).hasSize(2);
        assertThat(mug.getStock()).isEqualTo(2);
        assertThat(lamp.getStock()).isEqualTo(1);
    }

    @Test
    void placeOrder_failsWhenStockIsInsufficient() {
        when(products.findAllForUpdate(anyCollection())).thenReturn(List.of(lamp));
        var request = new PlaceOrderRequest(List.of(new PlaceOrderRequest.Line(2L, 3)), address);

        assertThatThrownBy(() -> service.place(7L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Not enough stock");
        verify(orders, never()).save(any());
    }

    @Test
    void placeOrder_rejectsInactiveOrUnknownProducts() {
        mug.setActive(false);
        when(products.findAllForUpdate(anyCollection())).thenReturn(List.of(mug));
        var request = new PlaceOrderRequest(List.of(new PlaceOrderRequest.Line(1L, 1)), address);

        assertThatThrownBy(() -> service.place(7L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void cancellingAnOrder_putsItemsBackInStock() {
        Order order = withId(new Order(customer, address), 100L);
        order.addItem(mug, 4);
        when(orders.findById(100L)).thenReturn(Optional.of(order));

        service.changeStatus(100L, OrderStatus.CANCELLED);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(mug.getStock()).isEqualTo(5);
    }

    @Test
    void invalidTransition_isRejected() {
        Order order = withId(new Order(customer, address), 100L);
        when(orders.findById(100L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.changeStatus(100L, OrderStatus.DELIVERED))
                .isInstanceOf(BusinessException.class);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
