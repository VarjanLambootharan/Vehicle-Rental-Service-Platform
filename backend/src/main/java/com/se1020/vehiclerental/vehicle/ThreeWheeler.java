package com.se1020.vehiclerental.vehicle;

import java.math.BigDecimal;

public final class ThreeWheeler extends EngineVehicle {
  private ThreeWheeler() {}

  public ThreeWheeler(
      String registration,
      String brand,
      String model,
      BigDecimal rate,
      String description,
      int cc) {
    super(registration, brand, model, rate, description);
    updateThreeWheeler(cc);
  }

  public void updateThreeWheeler(int cc) {
    updateEngineCapacity(cc, "THREE_WHEELER");
  }

  @Override
  public String getType() {
    return "THREE_WHEELER";
  }

  @Override
  public int passengerCapacity() {
    return 4;
  }

  @Override
  public String rentalGuidance() {
    return "Three-wheeler licence required; fixed capacity of 4 occupants; "
        + getEngineCapacityCc()
        + " cc engine.";
  }
}
