package com.se1020.vehiclerental.vehicle;

import java.util.*;

/** Aggregates existing vehicles without owning their lifecycle or persistence. */
public final class VehicleCatalogue {
  private final List<Vehicle> vehicles;

  public VehicleCatalogue(List<Vehicle> vehicles) {
    this.vehicles = List.copyOf(vehicles);
  }

  public List<Vehicle> search(
      String query, String type, int minimumPassengers, boolean includeInactive) {
    String term = query == null ? "" : query.toLowerCase(Locale.ROOT);
    return vehicles.stream()
        .filter(v -> includeInactive || v.getStatus() != VehicleStatus.INACTIVE)
        .filter(v -> type == null || v.getType().equalsIgnoreCase(type))
        .filter(v -> v.passengerCapacity() >= minimumPassengers)
        .filter(
            v ->
                (v.getBrand() + " " + v.getModel() + " " + v.getRegistrationNumber())
                    .toLowerCase(Locale.ROOT)
                    .contains(term))
        .toList();
  }
}
