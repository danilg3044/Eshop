package com.example.eshop.product;

import com.example.eshop.common.PageResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public catalog: anyone can browse active products, no login needed. */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ProductDto> list(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) String category,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "12") int size) {
        return service.search(q, category, true, page, size);
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return service.categories();
    }

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable Long id) {
        return service.get(id, true);
    }
}
