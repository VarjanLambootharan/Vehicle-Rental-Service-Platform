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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

public class VehicleServiceTest extends Fixture {

  @Test
  void createsAllTypesAndUsesPolymorphicCatalogue() {
    as(admin);
    vehicleService.create(carRequest("NEW-200", BigDecimal.TEN));
    vehicleService.create(
        new VehicleRequest(
            "VAN", "VAN-1", "Toyota", "Hiace", BigDecimal.TEN, "Van", 12, "MANUAL", null));
    vehicleService.create(
        new VehicleRequest(
            "MOTORCYCLE", "BIKE-1", "Honda", "CB", BigDecimal.TEN, "Bike", null, null, 150));
    vehicleService.create(
        new VehicleRequest(
            "THREE_WHEELER",
            "TUK-1",
            "Bajaj",
            "RE",
            BigDecimal.TEN,
            "Three-wheeler",
            99,
            "ignored",
            200));
    assertThat(vehicleService.list(null, null, 4, null, null)).hasSize(4);
    assertThat(vehicleService.list(null, "VAN", 10, null, null)).hasSize(1);
    assertThat(vehicleService.list(null, "THREE_WHEELER", 4, null, null))
        .singleElement()
        .satisfies(v -> assertThat(v.passengerCapacity()).isEqualTo(4));
    assertThat(vehicleService.list(null, "MOTORCYCLE", 0, null, null).getFirst().rentalGuidance())
        .contains("150 cc");
  }

  @Test
  void fixedCapacityVehicleTypesIgnoreSubmittedSeats() {
    as(admin);
    var bike =
        vehicleService.create(
            new VehicleRequest(
                "MOTORCYCLE", "BIKE-2", "Honda", "Dio", BigDecimal.TEN, "Bike", 99, "AUTO", 110));
    var threeWheeler =
        vehicleService.create(
            new VehicleRequest(
                "THREE_WHEELER", "TUK-2", "Bajaj", "RE", BigDecimal.TEN, "Tuk", 1, "MANUAL", 200));

    assertThat(bike.passengerCapacity()).isEqualTo(2);
    assertThat(threeWheeler.passengerCapacity()).isEqualTo(4);
    assertThat(bike.seats()).isNull();
    assertThat(threeWheeler.seats()).isNull();
  }

  @Test
  void validatesCategorySpecificCapacities() {
    as(admin);
    assertThatThrownBy(
            () ->
                vehicleService.create(
                    new VehicleRequest(
                        "VAN", "VAN-2", "Toyota", "Hiace", BigDecimal.TEN, "Van", 5, "AUTO", null)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("6–18");
    assertThatThrownBy(
            () ->
                vehicleService.create(
                    new VehicleRequest(
                        "THREE_WHEELER",
                        "TUK-3",
                        "Bajaj",
                        "RE",
                        BigDecimal.TEN,
                        "Tuk",
                        null,
                        null,
                        30)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("50–2500");
  }

  @ParameterizedTest
  @CsvSource({"CAR,2", "CAR,9", "VAN,6", "VAN,18"})
  void configurableCapacityAcceptsBothBoundaries(String type, int seats) {
    as(admin);
    var created =
        vehicleService.create(
            new VehicleRequest(
                type, "BOUNDARY-" + seats, "Test", type, BigDecimal.TEN, "", seats, "AUTO", null));
    assertThat(vehicleService.get(created.id()).passengerCapacity()).isEqualTo(seats);
    assertThat(vehicleService.list(null, type, seats, null, null))
        .extracting(v -> v.id())
        .contains(created.id());
    assertThat(vehicleService.list(null, type, seats + 1, null, null))
        .extracting(v -> v.id())
        .doesNotContain(created.id());
  }

  @ParameterizedTest
  @CsvSource({"CAR,1", "CAR,10", "VAN,5", "VAN,19"})
  void configurableCapacityRejectsValuesOutsideRange(String type, int seats) {
    as(admin);
    assertThatThrownBy(
            () ->
                vehicleService.create(
                    new VehicleRequest(
                        type,
                        "INVALID-" + seats,
                        "Test",
                        type,
                        BigDecimal.TEN,
                        "",
                        seats,
                        "AUTO",
                        null)))
        .isInstanceOf(BusinessException.class);
    assertThat(vehicles.findAll()).hasSize(1);
  }

  @ParameterizedTest
  @CsvSource({"MOTORCYCLE,2", "THREE_WHEELER,4"})
  void fixedCapacitySurvivesUpdatesAndFilters(String type, int capacity) {
    as(admin);
    var created =
        vehicleService.create(
            new VehicleRequest(type, "FIXED", "Test", type, BigDecimal.TEN, "", 99, null, 150));
    var updated =
        vehicleService.update(
            created.id(),
            new VehicleRequest(
                type, "FIXED", "Test", type, BigDecimal.TEN, "Changed", -1, null, 200));
    assertThat(updated.passengerCapacity()).isEqualTo(capacity);
    assertThat(vehicleService.get(created.id()).passengerCapacity()).isEqualTo(capacity);
    assertThat(vehicleService.list(null, type, capacity, null, null)).hasSize(1);
    assertThat(vehicleService.list(null, type, capacity + 1, null, null)).isEmpty();
    assertThatThrownBy(
            () -> vehicleService.update(created.id(), carRequest("FIXED", BigDecimal.TEN)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("immutable");
  }

  @Test
  void vanTransmissionFilterAndUpdatePreserveSubtype() {
    as(admin);
    var created =
        vehicleService.create(
            new VehicleRequest(
                "VAN", "VAN-EDIT", "Toyota", "Hiace", BigDecimal.TEN, "", 6, "MANUAL", null));
    var updated =
        vehicleService.update(
            created.id(),
            new VehicleRequest(
                "VAN", "VAN-EDIT", "Toyota", "Hiace", BigDecimal.TEN, "", 18, "AUTO", null));
    assertThat(updated.type()).isEqualTo("VAN");
    assertThat(updated.passengerCapacity()).isEqualTo(18);
    assertThat(vehicleService.list(null, "VAN", 18, null, null, null, null, "auto", null))
        .hasSize(1);
    assertThat(vehicleService.list(null, "VAN", 0, null, null, null, null, "manual", null))
        .isEmpty();
  }

  @ParameterizedTest
  @CsvSource({"MOTORCYCLE,50", "MOTORCYCLE,2500", "THREE_WHEELER,50", "THREE_WHEELER,2500"})
  void engineTypesAcceptBothCapacityBoundaries(String type, int cc) {
    as(admin);
    var created =
        vehicleService.create(
            new VehicleRequest(type, "ENGINE", "Test", type, BigDecimal.TEN, "", null, null, cc));
    assertThat(vehicleService.get(created.id()).engineCapacityCc()).isEqualTo(cc);
  }

  @ParameterizedTest
  @CsvSource({"MOTORCYCLE,49", "MOTORCYCLE,2501", "THREE_WHEELER,49", "THREE_WHEELER,2501"})
  void engineTypesRejectCapacityOutsideRange(String type, int cc) {
    as(admin);
    assertThatThrownBy(
            () ->
                vehicleService.create(
                    new VehicleRequest(
                        type, "ENGINE", "Test", type, BigDecimal.TEN, "", null, null, cc)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void missingSubtypeSpecificationsAreRejected() {
    as(admin);
    for (String type : List.of("CAR", "VAN", "MOTORCYCLE", "THREE_WHEELER")) {
      assertThatThrownBy(
              () ->
                  vehicleService.create(
                      new VehicleRequest(
                          type, "MISSING", "Test", type, BigDecimal.TEN, "", null, null, null)))
          .isInstanceOf(BusinessException.class);
    }
  }

  @ParameterizedTest
  @CsvSource({"CAR", "VAN", "MOTORCYCLE", "THREE_WHEELER"})
  void everySubtypeUsesSharedStatusAndDeactivationRules(String type) {
    as(admin);
    var created =
        vehicleService.create(
            new VehicleRequest(
                type,
                "LIFECYCLE",
                "Test",
                type,
                BigDecimal.TEN,
                "",
                type.equals("VAN") ? 12 : 5,
                "AUTO",
                150));
    vehicleService.status(created.id(), VehicleStatus.IN_MAINTENANCE);
    assertThat(vehicleService.get(created.id()).status()).isEqualTo(VehicleStatus.IN_MAINTENANCE);
    vehicleService.status(created.id(), VehicleStatus.INACTIVE);
    as(alice);
    assertThat(vehicleService.list(null, type, 0, null, null))
        .extracting(v -> v.id())
        .doesNotContain(created.id());
    assertThatThrownBy(() -> vehicleService.get(created.id()))
        .isInstanceOf(ResourceNotFoundException.class);
    as(admin);
    assertThat(vehicleService.get(created.id()).type()).isEqualTo(type);
    vehicleService.status(created.id(), VehicleStatus.AVAILABLE);
    assertThat(vehicleService.list(null, type, 0, today, today.plusDays(1)))
        .extracting(v -> v.id())
        .contains(created.id());
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
