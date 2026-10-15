package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import java.math.BigDecimal;

public final class Motorcycle extends Vehicle {
  private int engineCapacityCc;

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
    require(cc >= 50 && cc <= 2500, "INVALID_MOTORCYCLE", "Engine capacity must be 50–2500 cc");
    engineCapacityCc = cc;
    touch();
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
        + engineCapacityCc
        + " cc required; helmets required for rider and passenger.";
  }

  public int getEngineCapacityCc() {
    return engineCapacityCc;
  }
}
