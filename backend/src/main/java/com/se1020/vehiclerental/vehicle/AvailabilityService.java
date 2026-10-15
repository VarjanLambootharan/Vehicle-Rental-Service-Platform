package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.booking.RentalPeriod;
import com.se1020.vehiclerental.maintenance.MaintenanceRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class AvailabilityService {
  private final VehicleRepository vehicles;
  private final BookingRepository bookings;
  private final MaintenanceRepository maintenance;

  public AvailabilityService(
      VehicleRepository vehicles, BookingRepository bookings, MaintenanceRepository maintenance) {
    this.vehicles = vehicles;
    this.bookings = bookings;
    this.maintenance = maintenance;
  }

  /** Call under StorageCoordinator for any mutation depending on availability. */
  public boolean available(UUID vehicleId, RentalPeriod period, UUID excludedBooking) {
    if (vehicles.require(vehicleId).getStatus() != VehicleStatus.AVAILABLE) return false;
    if (bookings.findAll().stream()
        .anyMatch(
            b ->
                b.getVehicleId().equals(vehicleId)
                    && !b.getId().equals(excludedBooking)
                    && b.blocksDates()
                    && b.getRentalPeriod().overlaps(period))) return false;
    return maintenance.findAll().stream()
        .noneMatch(m -> m.getVehicleId().equals(vehicleId) && m.blocks(period));
  }

  public void requireAvailable(UUID vehicleId, RentalPeriod period, UUID excludedBooking) {
    require(
        available(vehicleId, period, excludedBooking),
        "VEHICLE_UNAVAILABLE",
        "Vehicle is unavailable for the requested period");
  }

  public void requireNoProtectedBookings(UUID vehicleId) {
    require(
        bookings.findAll().stream()
            .noneMatch(b -> b.getVehicleId().equals(vehicleId) && b.blocksDates()),
        "VEHICLE_HAS_BOOKINGS",
        "Resolve protected bookings before restricting the vehicle");
  }
}
