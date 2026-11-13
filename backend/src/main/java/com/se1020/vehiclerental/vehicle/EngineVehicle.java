package com.se1020.vehiclerental.vehicle;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import java.math.BigDecimal;

/** Base for fixed-capacity vehicles identified by an engine displacement. */
public abstract class EngineVehicle extends Vehicle {
  private int engineCapacityCc;

  protected EngineVehicle() {}

  protected EngineVehicle(
      String registration, String brand, String model, BigDecimal rate, String description) {
    super(registration, brand, model, rate, description);
  }

  protected final void updateEngineCapacity(int cc, String vehicleName) {
    require(
        cc >= 50 && cc <= 2500,
        "INVALID_" + vehicleName.toUpperCase(java.util.Locale.ROOT),
        "Engine capacity must be 50–2500 cc");
    engineCapacityCc = cc;
    touch();
  }

  public int getEngineCapacityCc() {
    return engineCapacityCc;
  }
}
