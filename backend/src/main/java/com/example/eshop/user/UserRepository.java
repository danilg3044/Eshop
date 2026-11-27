package com.example.eshop.user;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findBySubject(String subject);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    @Query("""
            select u from AppUser u
            where (:role is null or u.role = :role)
              and (:q is null
                   or lower(u.email) like lower(concat('%', :q, '%'))
                   or lower(u.profile.firstName) like lower(concat('%', :q, '%'))
                   or lower(u.profile.lastName) like lower(concat('%', :q, '%')))
            """)
    Page<AppUser> search(@Param("role") Role role, @Param("q") String q, Pageable pageable);
}
