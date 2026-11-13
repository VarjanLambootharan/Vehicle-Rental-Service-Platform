package com.se1020.vehiclerental.vehicle;

import java.math.BigDecimal;

public final class Car extends ConfigurablePassengerVehicle {

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
    updatePassengerConfiguration(seats, transmission, 2, 9, "CAR");
  }

  @Override
  public String getType() {
    return "CAR";
  }

  @Override
  public String rentalGuidance() {
    return "Car licence required; maximum "
        + getSeats()
        + " occupants; "
        + getTransmission()
        + " transmission.";
  }
}
