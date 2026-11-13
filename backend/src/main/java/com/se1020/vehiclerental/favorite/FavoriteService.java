package com.se1020.vehiclerental.favorite;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.favorite.dto.*;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.VehicleRepository;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class FavoriteService {
  private final FavoriteRepository favorites;
  private final VehicleRepository vehicles;
  private final StorageCoordinator coordinator;
  private final Access access;

  public FavoriteService(
      FavoriteRepository favorites,
      VehicleRepository vehicles,
      StorageCoordinator coordinator,
      Access access) {
    this.favorites = favorites;
    this.vehicles = vehicles;
    this.coordinator = coordinator;
    this.access = access;
  }

  public List<FavoriteResponse> mine() {
    UUID customer = access.customer().getId();
    return favorites.findAll().stream()
        .filter(f -> f.getCustomerId().equals(customer))
        .map(f -> FavoriteResponse.from(f, vehicles.require(f.getVehicleId()).getStatus()))
        .toList();
  }

  public FavoriteResponse add(FavoriteRequest request) {
    return coordinator.locked(
        () -> {
          UUID customer = access.customer().getId();
          vehicles.require(request.vehicleId());
          require(
              favorites.findAll().stream()
                  .noneMatch(
                      f ->
                          f.getCustomerId().equals(customer)
                              && f.getVehicleId().equals(request.vehicleId())),
              "DUPLICATE_FAVORITE",
              "Vehicle is already a favourite");
          return FavoriteResponse.from(
              favorites.save(new Favorite(customer, request.vehicleId())),
              vehicles.require(request.vehicleId()).getStatus());
        });
  }

  public void remove(UUID id) {
    coordinator.locked(
        () -> {
          Favorite favorite = favorites.require(id);
          access.customer();
          access.owner(favorite.getCustomerId());
          favorites.delete(id);
          return null;
        });
  }
}
