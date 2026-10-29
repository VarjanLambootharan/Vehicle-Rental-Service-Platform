package com.se1020.vehiclerental.booking;

import java.time.*;
import java.time.temporal.ChronoUnit;

public record RentalPeriod(LocalDate pickupDate, LocalDate returnDate) {
  public RentalPeriod {
    if (pickupDate == null || returnDate == null || !returnDate.isAfter(pickupDate))
      throw new IllegalArgumentException("Return must follow pickup");
  }

  public long days() {
    return ChronoUnit.DAYS.between(pickupDate, returnDate);
  }

  public boolean overlaps(RentalPeriod other) {
    return pickupDate.isBefore(other.returnDate) && other.pickupDate.isBefore(returnDate);
  }

  public boolean contains(LocalDate date) {
    return !date.isBefore(pickupDate) && date.isBefore(returnDate);
  }

  public void requireNotPast(Clock clock) {
    if (pickupDate.isBefore(LocalDate.now(clock)))
      throw new IllegalArgumentException("Pickup cannot be in the past");
  }
}
