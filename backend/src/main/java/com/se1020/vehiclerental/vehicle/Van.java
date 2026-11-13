package com.se1020.vehiclerental.vehicle;

import java.math.BigDecimal;

public final class Van extends ConfigurablePassengerVehicle {
  private Van() {}

  public Van(
      String registration,
      String brand,
      String model,
      BigDecimal rate,
      String description,
      int seats,
      String transmission) {
    super(registration, brand, model, rate, description);
    updateVan(seats, transmission);
  }

  public void updateVan(int seats, String transmission) {
    updatePassengerConfiguration(seats, transmission, 6, 18, "VAN");
  }

  @Override
  public String getType() {
    return "VAN";
  }

  @Override
  public String rentalGuidance() {
    return "Van licence required; maximum "
        + getSeats()
        + " occupants; "
        + getTransmission()
        + " transmission.";
  }
}
