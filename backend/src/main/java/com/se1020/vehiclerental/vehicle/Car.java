package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import java.math.BigDecimal;

public final class Car extends Vehicle {
  private int seats;
  private String transmission;

  private Car() {}

  public Car(
      String registration,
      String brand,
      String model,
      BigDecimal rate,
      String description,
      int seats,
      String transmission) {
    super(registration, brand, model, rate, description);
    updateCar(seats, transmission);
  }

  public void updateCar(int seats, String transmission) {
    require(
        seats >= 2 && seats <= 9 && transmission != null && !transmission.isBlank(),
        "INVALID_CAR",
        "A car needs 2–9 seats and a transmission");
    this.seats = seats;
    this.transmission = transmission;
    touch();
  }

  @Override
  public String getType() {
    return "CAR";
  }

  @Override
  public int passengerCapacity() {
    return seats;
  }

  @Override
  public String rentalGuidance() {
    return "Car licence required; maximum "
        + seats
        + " occupants; "
        + transmission
        + " transmission.";
  }

  public int getSeats() {
    return seats;
  }

  public String getTransmission() {
    return transmission;
  }
}
