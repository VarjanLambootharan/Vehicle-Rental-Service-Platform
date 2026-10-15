package com.se1020.vehiclerental.vehicle;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.support.Fixture;
import com.se1020.vehiclerental.vehicle.dto.VehicleRequest;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class VehicleServiceTest extends Fixture {

  @Test
  void createsBothTypesAndUsesPolymorphicCatalogue() {
    as(admin);
    vehicleService.create(carRequest("NEW-200", BigDecimal.TEN));
    vehicleService.create(
        new VehicleRequest(
            "MOTORCYCLE", "BIKE-1", "Honda", "CB", BigDecimal.TEN, "Bike", null, null, 150));
    assertThat(vehicleService.list(null, null, 4, null, null)).hasSize(2);
    assertThat(vehicleService.list(null, "MOTORCYCLE", 0, null, null).getFirst().rentalGuidance())
        .contains("150 cc");
  }

  @Test
  void duplicateRegistrationRejected() {
    as(admin);
    assertThatThrownBy(() -> vehicleService.create(carRequest("car-100", BigDecimal.TEN)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void negativePriceRejected() {
    as(admin);
    assertThatThrownBy(() -> vehicleService.create(carRequest("NEG", BigDecimal.ZERO)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void updatesRateAndPreservesSnapshot() {
    var b = book(1, 3);
    as(admin);
    vehicleService.update(car.getId(), carRequest("CAR-100", BigDecimal.TEN));
    assertThat(bookings.require(b.getId()).getDailyRateSnapshot()).isEqualByComparingTo("7500");
  }

  @Test
  void softDeleteHidesPublicCatalogueButKeepsRecord() {
    as(admin);
    vehicleService.status(car.getId(), VehicleStatus.INACTIVE);
    assertThat(vehicleService.list(null, null, 0, null, null)).hasSize(1);
    as(alice);
    assertThat(vehicleService.list(null, null, 0, null, null)).isEmpty();
    assertThatThrownBy(() -> vehicleService.get(car.getId()))
        .isInstanceOf(ResourceNotFoundException.class);
    assertThat(vehicles.findAll()).hasSize(1);
  }

  @Test
  void statusRestrictionRejectsProtectedBookings() {
    book(1, 3);
    as(admin);
    assertThatThrownBy(() -> vehicleService.status(car.getId(), VehicleStatus.IN_MAINTENANCE))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void identityChangeCannotInvalidateBooking() {
    book(1, 3);
    as(admin);
    assertThatThrownBy(
            () -> vehicleService.update(car.getId(), carRequest("NEW-REG", BigDecimal.TEN)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void filtersAvailableDates() {
    book(1, 3);
    assertThat(vehicleService.list(null, null, 0, today.plusDays(2), today.plusDays(4))).isEmpty();
    assertThat(vehicleService.list("Toyota", null, 0, today.plusDays(3), today.plusDays(4)))
        .hasSize(1);
  }
}
