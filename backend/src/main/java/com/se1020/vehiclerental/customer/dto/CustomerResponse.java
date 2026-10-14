package com.se1020.vehiclerental.customer.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public record CustomerResponse(
    UUID id,
    String fullName,
    String email,
    String phone,
    com.se1020.vehiclerental.customer.Role role,
    boolean active,
    Instant createdAt,
    Instant updatedAt) {
  public static CustomerResponse from(com.se1020.vehiclerental.customer.User u) {
    return new CustomerResponse(
        u.getId(),
        u.getFullName(),
        u.getEmail(),
        u.getPhone(),
        u.getRole(),
        u.isActive(),
        u.getCreatedAt(),
        u.getUpdatedAt());
  }
}
