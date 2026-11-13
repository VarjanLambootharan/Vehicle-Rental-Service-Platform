package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import java.math.BigDecimal;

/** Base for road vehicles whose passenger capacity and transmission are set by an administrator. */
public abstract class ConfigurablePassengerVehicle extends Vehicle {
  private int seats;
  private String transmission;

  protected ConfigurablePassengerVehicle() {}

  protected ConfigurablePassengerVehicle(
      String registration, String brand, String model, BigDecimal rate, String description) {
    super(registration, brand, model, rate, description);
  }

  protected final void updatePassengerConfiguration(
      int seats, String transmission, int minimumSeats, int maximumSeats, String vehicleName) {
    require(
        seats >= minimumSeats
            && seats <= maximumSeats
            && transmission != null
            && !transmission.isBlank(),
        "INVALID_" + vehicleName.toUpperCase(java.util.Locale.ROOT),
        "A "
            + vehicleName.toLowerCase(java.util.Locale.ROOT)
            + " needs "
            + minimumSeats
            + "–"
            + maximumSeats
            + " seats and a transmission");
    this.seats = seats;
    this.transmission = transmission.trim();
    touch();
  }

  @Override
  public final int passengerCapacity() {
    return seats;
  }

  public int getSeats() {
    return seats;
  }

  public String getTransmission() {
    return transmission;
  }
}
