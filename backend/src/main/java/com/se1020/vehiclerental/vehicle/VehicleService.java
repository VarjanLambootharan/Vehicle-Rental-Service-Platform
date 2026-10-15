package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.RentalPeriod;
import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.dto.VehicleRequest;
import com.se1020.vehiclerental.vehicle.dto.VehicleResponse;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class VehicleService {
  private final VehicleRepository vehicles;
  private final AvailabilityService availability;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final Clock clock;

  public VehicleService(
      VehicleRepository vehicles,
      AvailabilityService availability,
      StorageCoordinator coordinator,
      Access access,
      Clock clock) {
    this.vehicles = vehicles;
    this.availability = availability;
    this.coordinator = coordinator;
    this.access = access;
    this.clock = clock;
  }

  public List<VehicleResponse> list(
      String query, String type, int passengers, LocalDate pickup, LocalDate returned) {
    return coordinator.locked(
        () -> {
          if ((pickup == null) != (returned == null) || passengers < 0)
            throw new IllegalArgumentException(
                "Supply both dates and a nonnegative passenger count");
          RentalPeriod period = pickup == null ? null : new RentalPeriod(pickup, returned);
          if (period != null) period.requireNotPast(clock);
          return new VehicleCatalogue(vehicles.findAll())
              .search(query, type, passengers, access.isAdmin()).stream()
                  .filter(v -> period == null || availability.available(v.getId(), period, null))
                  .map(VehicleResponse::from)
                  .toList();
        });
  }

  public VehicleResponse get(UUID id) {
    var v = vehicles.require(id);
    if (v.getStatus() == VehicleStatus.INACTIVE && !access.isAdmin())
      throw new ResourceNotFoundException("Vehicle");
    return VehicleResponse.from(v);
  }

  private void unique(String registration, UUID excluding) {
    require(
        vehicles.findAll().stream()
            .noneMatch(
                v ->
                    !v.getId().equals(excluding)
                        && v.getRegistrationNumber().equalsIgnoreCase(registration.trim())),
        "DUPLICATE_REGISTRATION",
        "Registration number already exists");
  }

  public VehicleResponse create(VehicleRequest r) {
    return coordinator.locked(
        () -> {
          access.admin();
          unique(r.registrationNumber(), null);
          Vehicle v =
              switch (r.type()) {
                case "CAR" ->
                    new Car(
                        r.registrationNumber(),
                        r.brand(),
                        r.model(),
                        r.dailyRate(),
                        r.description(),
                        r.seats() == null ? 0 : r.seats(),
                        r.transmission());
                case "MOTORCYCLE" ->
                    new Motorcycle(
                        r.registrationNumber(),
                        r.brand(),
                        r.model(),
                        r.dailyRate(),
                        r.description(),
                        r.engineCapacityCc() == null ? 0 : r.engineCapacityCc());
                default -> throw new IllegalArgumentException("Unknown vehicle type");
              };
          return VehicleResponse.from(vehicles.save(v));
        });
  }

  public VehicleResponse update(UUID id, VehicleRequest r) {
    return coordinator.locked(
        () -> {
          access.admin();
          Vehicle v = vehicles.require(id);
          unique(r.registrationNumber(), id);
          require(v.getType().equals(r.type()), "VEHICLE_TYPE", "Vehicle type is immutable");
          boolean identityChange =
              !v.getRegistrationNumber().equalsIgnoreCase(r.registrationNumber().trim())
                  || !v.getBrand().equals(r.brand().trim())
                  || !v.getModel().equals(r.model().trim());
          if (v instanceof Car c)
            identityChange =
                identityChange
                    || !Objects.equals(r.seats(), c.getSeats())
                    || !Objects.equals(r.transmission(), c.getTransmission());
          if (v instanceof Motorcycle m)
            identityChange =
                identityChange || !Objects.equals(r.engineCapacityCc(), m.getEngineCapacityCc());
          if (identityChange) availability.requireNoProtectedBookings(id);
          v.updateDetails(
              r.registrationNumber(), r.brand(), r.model(), r.dailyRate(), r.description());
          if (v instanceof Car c) c.updateCar(r.seats() == null ? 0 : r.seats(), r.transmission());
          if (v instanceof Motorcycle m)
            m.updateMotorcycle(r.engineCapacityCc() == null ? 0 : r.engineCapacityCc());
          return VehicleResponse.from(vehicles.save(v));
        });
  }

  public VehicleResponse status(UUID id, VehicleStatus status) {
    return coordinator.locked(
        () -> {
          access.admin();
          var v = vehicles.require(id);
          if (status != VehicleStatus.AVAILABLE) availability.requireNoProtectedBookings(id);
          v.changeAdministrativeStatus(status);
          return VehicleResponse.from(vehicles.save(v));
        });
  }
}
