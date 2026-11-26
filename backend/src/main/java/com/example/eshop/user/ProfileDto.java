package com.example.eshop.user;

import jakarta.validation.constraints.Size;

/** Editable profile fields, used for both reading and updating. */
public record ProfileDto(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 40) String phone,
        @Size(max = 255) String addressLine,
        @Size(max = 100) String city,
        @Size(max = 20) String postalCode,
        @Size(max = 100) String country) {

    public static ProfileDto from(Profile p) {
        return new ProfileDto(p.getFirstName(), p.getLastName(), p.getPhone(),
                p.getAddressLine(), p.getCity(), p.getPostalCode(), p.getCountry());
    }

    public void applyTo(Profile p) {
        p.setFirstName(firstName);
        p.setLastName(lastName);
        p.setPhone(phone);
        p.setAddressLine(addressLine);
        p.setCity(city);
        p.setPostalCode(postalCode);
        p.setCountry(country);
    }
}
