package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.common.model.Entity;
import java.math.BigDecimal;

public abstract class Vehicle extends Entity {
  private String registrationNumber, brand, model, description;
  private BigDecimal dailyRate;
  private VehicleStatus status = VehicleStatus.AVAILABLE;

  protected Vehicle() {}

  protected Vehicle(
      String registration, String brand, String model, BigDecimal rate, String description) {
    updateDetails(registration, brand, model, rate, description);
  }

  public void updateDetails(
      String registration, String brand, String model, BigDecimal rate, String description) {
    require(rate != null && rate.signum() > 0, "INVALID_RATE", "Daily rate must be positive");
    this.registrationNumber = registration.trim().toUpperCase(java.util.Locale.ROOT);
    this.brand = brand.trim();
    this.model = model.trim();
    this.dailyRate = rate;
    this.description = description;
    touch();
  }

  public void changeAdministrativeStatus(VehicleStatus status) {
    require(status != null, "INVALID_STATUS", "Vehicle status required");
    this.status = status;
    touch();
  }

  public abstract String getType();

  public abstract String rentalGuidance();

  public abstract int passengerCapacity();

  public String getRegistrationNumber() {
    return registrationNumber;
  }

  public String getBrand() {
    return brand;
  }

  public String getModel() {
    return model;
  }

  public String getDescription() {
    return description;
  }

  public BigDecimal getDailyRate() {
    return dailyRate;
  }

  public VehicleStatus getStatus() {
    return status;
  }
}
