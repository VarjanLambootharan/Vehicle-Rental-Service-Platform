package com.se1020.vehiclerental.vehicle;

import java.math.BigDecimal;

public final class Motorcycle extends EngineVehicle {

  private Motorcycle() {}

  public Motorcycle(
      String registration,
      String brand,
      String model,
      BigDecimal rate,
      String description,
      int cc) {
    super(registration, brand, model, rate, description);
    updateMotorcycle(cc);
  }

  public void updateMotorcycle(int cc) {
    updateEngineCapacity(cc, "MOTORCYCLE");
  }

  @Override
  public String getType() {
    return "MOTORCYCLE";
  }

  @Override
  public int passengerCapacity() {
    return 2;
  }

  @Override
  public String rentalGuidance() {
    return "Motorcycle licence for "
        + getEngineCapacityCc()
        + " cc required; helmets required for rider and passenger.";
  }
}
