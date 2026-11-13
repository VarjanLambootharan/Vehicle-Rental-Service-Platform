package com.se1020.vehiclerental.favorite;

import com.se1020.vehiclerental.common.model.Entity;
import java.util.UUID;

public final class Favorite extends Entity {
  private UUID customerId;
  private UUID vehicleId;

  private Favorite() {}

  public Favorite(UUID customerId, UUID vehicleId) {
    this.customerId = customerId;
    this.vehicleId = vehicleId;
  }

  public UUID getCustomerId() {
    return customerId;
  }

  public UUID getVehicleId() {
    return vehicleId;
  }
}
