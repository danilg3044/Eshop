package com.example.auth.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The registration page's form (a JavaBean, so Thymeleaf's th:field can bind it). */
public class RegistrationForm {

	@NotBlank(message = "First name is required")
	@Size(max = 100)
	private String firstName = "";

	@NotBlank(message = "Last name is required")
	@Size(max = 100)
	private String lastName = "";

	@NotBlank(message = "Email is required")
	@Email(message = "Enter a valid email address")
	@Size(max = 255)
	private String email = "";

	@Size(min = 8, max = 100, message = "Password must be at least 8 characters")
	private String password = "";

	public String getFirstName() { return firstName; }
	public void setFirstName(String firstName) { this.firstName = firstName; }
	public String getLastName() { return lastName; }
	public void setLastName(String lastName) { this.lastName = lastName; }
	public String getEmail() { return email; }
	public void setEmail(String email) { this.email = email; }
	public String getPassword() { return password; }
	public void setPassword(String password) { this.password = password; }
}
