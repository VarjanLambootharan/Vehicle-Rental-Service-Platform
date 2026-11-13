package com.se1020.vehiclerental.booking.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public record BookingResponse(
    UUID id,
    UUID customerId,
    UUID vehicleId,
    String vehicleBrand,
    String vehicleModel,
    com.se1020.vehiclerental.vehicle.VehicleStatus vehicleStatus,
    com.se1020.vehiclerental.booking.RentalPeriod rentalPeriod,
    BigDecimal dailyRateSnapshot,
    BigDecimal totalAmount,
    String currency,
    com.se1020.vehiclerental.booking.BookingStatus status,
    Instant createdAt,
    Instant updatedAt,
    Instant cancelledAt,
    UUID cancellationWorkflowId) {
  public static BookingResponse from(com.se1020.vehiclerental.booking.Booking b) {
    return from(b, null);
  }

  public static BookingResponse from(
      com.se1020.vehiclerental.booking.Booking b,
      com.se1020.vehiclerental.vehicle.Vehicle vehicle) {
    return new BookingResponse(
        b.getId(),
        b.getCustomerId(),
        b.getVehicleId(),
        vehicle == null ? null : vehicle.getBrand(),
        vehicle == null ? null : vehicle.getModel(),
        vehicle == null ? null : vehicle.getStatus(),
        b.getRentalPeriod(),
        b.getDailyRateSnapshot(),
        b.getTotalAmount(),
        "LKR",
        b.getStatus(),
        b.getCreatedAt(),
        b.getUpdatedAt(),
        b.getCancelledAt(),
        b.getCancellationWorkflow() == null ? null : b.getCancellationWorkflow().getWorkflowId());
  }
}
