package com.se1020.vehiclerental.favorite.dto;

import com.se1020.vehiclerental.favorite.Favorite;
import com.se1020.vehiclerental.vehicle.VehicleStatus;
import java.time.Instant;
import java.util.UUID;

public record FavoriteResponse(
    UUID id, UUID vehicleId, VehicleStatus vehicleStatus, Instant createdAt) {
  public static FavoriteResponse from(Favorite favorite, VehicleStatus vehicleStatus) {
    return new FavoriteResponse(
        favorite.getId(), favorite.getVehicleId(), vehicleStatus, favorite.getCreatedAt());
  }
}
