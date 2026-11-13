package com.se1020.vehiclerental.vehicleimage.dto;

import com.se1020.vehiclerental.vehicleimage.VehicleImage;
import java.time.Instant;
import java.util.UUID;

public record VehicleImageResponse(
    UUID id,
    UUID vehicleId,
    String url,
    String altText,
    int displayOrder,
    Instant createdAt,
    Instant updatedAt) {
  public static VehicleImageResponse from(VehicleImage image) {
    return new VehicleImageResponse(
        image.getId(),
        image.getVehicleId(),
        image.getUrl(),
        image.getAltText(),
        image.getDisplayOrder(),
        image.getCreatedAt(),
        image.getUpdatedAt());
  }
}
