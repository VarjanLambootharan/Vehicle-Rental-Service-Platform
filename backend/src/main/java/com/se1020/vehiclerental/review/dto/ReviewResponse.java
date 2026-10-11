package com.se1020.vehiclerental.review.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public record ReviewResponse(
    UUID id,
    UUID customerId,
    UUID vehicleId,
    UUID bookingId,
    int rating,
    String comment,
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt) {
  public static ReviewResponse from(com.se1020.vehiclerental.review.Review r) {
    return new ReviewResponse(
        r.getId(),
        r.getCustomerId(),
        r.getVehicleId(),
        r.getBookingId(),
        r.getRating(),
        r.getComment(),
        r.getCreatedAt(),
        r.getUpdatedAt(),
        r.getDeletedAt());
  }
}
