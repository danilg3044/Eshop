package com.example.eshop.order;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Snapshot of where an order is shipped. Copied into the order so later profile edits don't change it. */
@Embeddable
public record ShippingAddress(
        @Column(name = "ship_name") @NotBlank @Size(max = 200) String name,
        @Column(name = "ship_address_line") @NotBlank @Size(max = 255) String addressLine,
        @Column(name = "ship_city") @NotBlank @Size(max = 100) String city,
        @Column(name = "ship_postal_code") @NotBlank @Size(max = 20) String postalCode,
        @Column(name = "ship_country") @NotBlank @Size(max = 100) String country) {
}
