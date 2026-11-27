package com.example.eshop.product;

import com.example.eshop.common.NotFoundException;
import com.example.eshop.common.PageResponse;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class ProductService {

    public static final int MAX_PAGE_SIZE = 100;

    private final ProductRepository products;

    public ProductService(ProductRepository products) {
        this.products = products;
    }

    public PageResponse<ProductDto> search(String q, String category, boolean activeOnly, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), Sort.by("name"));
        return PageResponse.of(
                products.search(blankToNull(q), blankToNull(category), activeOnly, pageable),
                ProductDto::from);
    }

    /** Customers only see active products; admins see all of them. */
    public ProductDto get(Long id, boolean activeOnly) {
        return products.findById(id)
                .filter(p -> !activeOnly || p.isActive())
                .map(ProductDto::from)
                .orElseThrow(() -> new NotFoundException("Product %d not found".formatted(id)));
    }

    @Transactional
    public ProductDto changeDescription(Long id, String description) {
        Product product = products.findById(id)
                .orElseThrow(() -> new NotFoundException("Product %d not found".formatted(id)));
        product.setDescription(StringUtils.hasText(description) ? description.trim() : null);
        return ProductDto.from(product);
    }

    public List<String> categories() {
        return products.findActiveCategories();
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }
}
