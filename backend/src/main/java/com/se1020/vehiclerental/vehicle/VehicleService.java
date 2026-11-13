package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.RentalPeriod;
import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.dto.VehicleRequest;
import com.se1020.vehiclerental.vehicle.dto.VehicleResponse;
import java.math.BigDecimal;
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
    return list(query, type, passengers, pickup, returned, null, null, null, null);
  }

  public List<VehicleResponse> list(
      String query,
      String type,
      int passengers,
      LocalDate pickup,
      LocalDate returned,
      BigDecimal minPrice,
      BigDecimal maxPrice,
      String transmission,
      String sort) {
    return coordinator.locked(
        () -> {
          if ((pickup == null) != (returned == null) || passengers < 0)
            throw new IllegalArgumentException(
                "Supply both dates and a nonnegative passenger count");
          if (minPrice != null && minPrice.signum() < 0
              || maxPrice != null && maxPrice.signum() < 0
              || minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0)
            throw new IllegalArgumentException("Supply a valid nonnegative price range");
          RentalPeriod period = pickup == null ? null : new RentalPeriod(pickup, returned);
          if (period != null) period.requireNotPast(clock);
          Comparator<Vehicle> comparator = catalogueSort(sort);
          return new VehicleCatalogue(vehicles.findAll())
              .search(query, type, passengers, access.isAdmin()).stream()
                  .filter(v -> period == null || availability.available(v.getId(), period, null))
                  .filter(v -> minPrice == null || v.getDailyRate().compareTo(minPrice) >= 0)
                  .filter(v -> maxPrice == null || v.getDailyRate().compareTo(maxPrice) <= 0)
                  .filter(
                      v ->
                          transmission == null
                              || v instanceof ConfigurablePassengerVehicle p
                                  && p.getTransmission().equalsIgnoreCase(transmission.trim()))
                  .sorted(comparator)
                  .map(VehicleResponse::from)
                  .toList();
        });
  }

  private static Comparator<Vehicle> catalogueSort(String value) {
    if (value == null || value.isBlank()) return Comparator.comparing(Vehicle::getCreatedAt);
    return switch (value) {
      case "PRICE_ASC" -> Comparator.comparing(Vehicle::getDailyRate);
      case "PRICE_DESC" -> Comparator.comparing(Vehicle::getDailyRate).reversed();
      case "BRAND_ASC" ->
          Comparator.comparing(Vehicle::getBrand, String.CASE_INSENSITIVE_ORDER)
              .thenComparing(Vehicle::getModel, String.CASE_INSENSITIVE_ORDER);
      case "CAPACITY_DESC" -> Comparator.comparingInt(Vehicle::passengerCapacity).reversed();
      default -> throw new IllegalArgumentException("Unknown vehicle sort value");
    };
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
                case "VAN" ->
                    new Van(
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
                case "THREE_WHEELER" ->
                    new ThreeWheeler(
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
          if (v instanceof ConfigurablePassengerVehicle p)
            identityChange =
                identityChange
                    || !Objects.equals(r.seats(), p.getSeats())
                    || !Objects.equals(r.transmission(), p.getTransmission());
          if (v instanceof EngineVehicle e)
            identityChange =
                identityChange || !Objects.equals(r.engineCapacityCc(), e.getEngineCapacityCc());
          if (identityChange) availability.requireNoProtectedBookings(id);
          v.updateDetails(
              r.registrationNumber(), r.brand(), r.model(), r.dailyRate(), r.description());
          if (v instanceof Car c) c.updateCar(r.seats() == null ? 0 : r.seats(), r.transmission());
          if (v instanceof Van van)
            van.updateVan(r.seats() == null ? 0 : r.seats(), r.transmission());
          if (v instanceof Motorcycle m)
            m.updateMotorcycle(r.engineCapacityCc() == null ? 0 : r.engineCapacityCc());
          if (v instanceof ThreeWheeler threeWheeler)
            threeWheeler.updateThreeWheeler(
                r.engineCapacityCc() == null ? 0 : r.engineCapacityCc());
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
