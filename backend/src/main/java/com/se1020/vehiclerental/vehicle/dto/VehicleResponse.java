package com.se1020.vehiclerental.vehicle.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public record VehicleResponse(
    UUID id,
    String type,
    String registrationNumber,
    String brand,
    String model,
    BigDecimal dailyRate,
    String description,
    com.se1020.vehiclerental.vehicle.VehicleStatus status,
    Integer seats,
    String transmission,
    Integer engineCapacityCc,
    int passengerCapacity,
    String rentalGuidance,
    Instant createdAt,
    Instant updatedAt) {
  public static VehicleResponse from(com.se1020.vehiclerental.vehicle.Vehicle v) {
    return new VehicleResponse(
        v.getId(),
        v.getType(),
        v.getRegistrationNumber(),
        v.getBrand(),
        v.getModel(),
        v.getDailyRate(),
        v.getDescription(),
        v.getStatus(),
        v instanceof com.se1020.vehiclerental.vehicle.Car c ? c.getSeats() : null,
        v instanceof com.se1020.vehiclerental.vehicle.Car c ? c.getTransmission() : null,
        v instanceof com.se1020.vehiclerental.vehicle.Motorcycle m ? m.getEngineCapacityCc() : null,
        v.passengerCapacity(),
        v.rentalGuidance(),
        v.getCreatedAt(),
        v.getUpdatedAt());
  }
}
