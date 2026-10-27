package com.se1020.vehiclerental.maintenance.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public record MaintenanceResponse(
    UUID id,
    UUID vehicleId,
    String description,
    LocalDate startDate,
    LocalDate endDate,
    BigDecimal cost,
    com.se1020.vehiclerental.maintenance.MaintenanceStatus status,
    Instant createdAt,
    Instant updatedAt) {
  public static MaintenanceResponse from(com.se1020.vehiclerental.maintenance.MaintenanceRecord m) {
    return new MaintenanceResponse(
        m.getId(),
        m.getVehicleId(),
        m.getDescription(),
        m.getStartDate(),
        m.getEndDate(),
        m.getCost(),
        m.getStatus(),
        m.getCreatedAt(),
        m.getUpdatedAt());
  }
}
