package com.se1020.vehiclerental.maintenance;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.RentalPeriod;
import com.se1020.vehiclerental.common.model.Entity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public final class MaintenanceRecord extends Entity {
  private UUID vehicleId;
  private String description;
  private LocalDate startDate, endDate;
  private BigDecimal cost;
  private MaintenanceStatus status = MaintenanceStatus.SCHEDULED;

  private MaintenanceRecord() {}

  public MaintenanceRecord(
      UUID vehicleId, String description, RentalPeriod period, BigDecimal cost) {
    this.vehicleId = vehicleId;
    edit(description, period, cost);
  }

  public void edit(String description, RentalPeriod period, BigDecimal cost) {
    require(
        status == MaintenanceStatus.SCHEDULED,
        "MAINTENANCE_STATE",
        "Only scheduled maintenance details can change");
    this.description = description;
    startDate = period.pickupDate();
    endDate = period.returnDate();
    this.cost = cost;
    touch();
  }

  public void transition(MaintenanceStatus next) {
    require(
        (status == MaintenanceStatus.SCHEDULED
                && (next == MaintenanceStatus.IN_PROGRESS || next == MaintenanceStatus.CANCELLED))
            || (status == MaintenanceStatus.IN_PROGRESS && next == MaintenanceStatus.COMPLETED),
        "MAINTENANCE_STATE",
        "Invalid maintenance transition");
    status = next;
    touch();
  }

  public boolean blocks(RentalPeriod period) {
    return status == MaintenanceStatus.IN_PROGRESS
        || (status == MaintenanceStatus.SCHEDULED && period().overlaps(period));
  }

  public RentalPeriod period() {
    return new RentalPeriod(startDate, endDate);
  }

  public UUID getVehicleId() {
    return vehicleId;
  }

  public String getDescription() {
    return description;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public LocalDate getEndDate() {
    return endDate;
  }

  public BigDecimal getCost() {
    return cost;
  }

  public MaintenanceStatus getStatus() {
    return status;
  }
}
