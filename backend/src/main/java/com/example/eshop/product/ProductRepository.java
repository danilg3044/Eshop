package com.example.eshop.product;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Searches by name/description/sku and category.
     * {@code activeOnly = true} is used for the customer catalog; admins see everything.
     */
    @Query("""
            select p from Product p
            where (:activeOnly = false or p.active = true)
              and (:category is null or p.category = :category)
              and (:q is null
                   or lower(p.name) like lower(concat('%', :q, '%'))
                   or lower(p.description) like lower(concat('%', :q, '%'))
                   or lower(p.sku) like lower(concat('%', :q, '%')))
            """)
    Page<Product> search(@Param("q") String q,
                         @Param("category") String category,
                         @Param("activeOnly") boolean activeOnly,
                         Pageable pageable);

    @Query("select distinct p.category from Product p where p.active = true order by p.category")
    List<String> findActiveCategories();

    /** Loads products with a row lock (UPDLOCK on SQL Server) for the rest of the transaction. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids")
    List<Product> findAllForUpdate(@Param("ids") Collection<Long> ids);
}
