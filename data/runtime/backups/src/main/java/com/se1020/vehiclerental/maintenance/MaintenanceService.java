package com.se1020.vehiclerental.maintenance;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.booking.BookingStatus;
import com.se1020.vehiclerental.booking.RentalPeriod;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceRequest;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceResponse;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceUpdateRequest;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.VehicleRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MaintenanceService {
  private final MaintenanceRepository maintenance;
  private final VehicleRepository vehicles;
  private final BookingRepository bookings;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final Clock clock;

  public MaintenanceService(
      MaintenanceRepository maintenance,
      VehicleRepository vehicles,
      BookingRepository bookings,
      StorageCoordinator coordinator,
      Access access,
      Clock clock) {
    this.maintenance = maintenance;
    this.vehicles = vehicles;
    this.bookings = bookings;
    this.coordinator = coordinator;
    this.access = access;
    this.clock = clock;
  }

  public List<MaintenanceResponse> list(String query, UUID vehicleId) {
    access.admin();
    String term = query == null ? "" : query.toLowerCase(Locale.ROOT);
    return maintenance.findAll().stream()
        .filter(m -> vehicleId == null || m.getVehicleId().equals(vehicleId))
        .filter(m -> m.getDescription().toLowerCase(Locale.ROOT).contains(term))
        .map(MaintenanceResponse::from)
        .toList();
  }

  public MaintenanceResponse get(UUID id) {
    access.admin();
    return MaintenanceResponse.from(maintenance.require(id));
  }

  private void check(UUID vehicleId, RentalPeriod period, UUID except) {
    vehicles.require(vehicleId);
    require(
        maintenance.findAll().stream()
            .noneMatch(
                m ->
                    m.getVehicleId().equals(vehicleId)
                        && !m.getId().equals(except)
                        && m.blocks(period)),
        "MAINTENANCE_CONFLICT",
        "Maintenance overlaps an existing restriction");
    require(
        bookings.findAll().stream()
            .noneMatch(
                b ->
                    b.getVehicleId().equals(vehicleId)
                        && b.blocksDates()
                        && (b.getStatus() == BookingStatus.ACTIVE
                            || b.getRentalPeriod().overlaps(period))),
        "BOOKING_CONFLICT",
        "Maintenance conflicts with a protected booking");
  }

  public MaintenanceResponse create(MaintenanceRequest r) {
    return coordinator.locked(
        () -> {
          access.admin();
          var period = new RentalPeriod(r.startDate(), r.endDate());
          period.requireNotPast(clock);
          check(r.vehicleId(), period, null);
          return MaintenanceResponse.from(
              maintenance.save(
                  new MaintenanceRecord(r.vehicleId(), r.description(), period, r.cost())));
        });
  }

  public MaintenanceResponse update(UUID id, MaintenanceUpdateRequest r) {
    return coordinator.locked(
        () -> {
          access.admin();
          var m = maintenance.require(id);
          var period = new RentalPeriod(r.startDate(), r.endDate());
          boolean changed =
              !m.period().equals(period)
                  || !m.getDescription().equals(r.description())
                  || m.getCost().compareTo(r.cost()) != 0;
          if (changed) {
            period.requireNotPast(clock);
            check(m.getVehicleId(), period, id);
            m.edit(r.description(), period, r.cost());
          }
          if (r.status() != m.getStatus()) {
            if (r.status() == MaintenanceStatus.IN_PROGRESS) {
              require(
                  period.contains(LocalDate.now(clock)),
                  "MAINTENANCE_DATE",
                  "Start maintenance only within its scheduled interval");
              check(m.getVehicleId(), period, id);
              require(
                  bookings.findAll().stream()
                      .noneMatch(b -> b.getVehicleId().equals(m.getVehicleId()) && b.blocksDates()),
                  "BOOKING_CONFLICT",
                  "Resolve protected rental commitments before starting maintenance");
            }
            m.transition(r.status());
          } else
            require(
                m.getStatus() == MaintenanceStatus.SCHEDULED,
                "MAINTENANCE_STATE",
                "Only scheduled details may be updated");
          return MaintenanceResponse.from(maintenance.save(m));
        });
  }

  public void cancel(UUID id) {
    coordinator.locked(
        () -> {
          access.admin();
          var m = maintenance.require(id);
          require(
              m.getStatus() == MaintenanceStatus.SCHEDULED,
              "MAINTENANCE_STATE",
              "Only scheduled maintenance can be cancelled");
          m.transition(MaintenanceStatus.CANCELLED);
          maintenance.save(m);
        });
  }
}
