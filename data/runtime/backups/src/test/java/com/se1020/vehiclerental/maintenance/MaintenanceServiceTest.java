package com.se1020.vehiclerental.maintenance;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.BookingStatus;
import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceRequest;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceUpdateRequest;
import com.se1020.vehiclerental.payment.PaymentMethod;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.support.Fixture;
import com.se1020.vehiclerental.vehicle.VehicleStatus;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class MaintenanceServiceTest extends Fixture {

  private MaintenanceRequest request(int start, int end) {
    return new MaintenanceRequest(
        car.getId(), "Service", today.plusDays(start), today.plusDays(end), new BigDecimal("1000"));
  }

  private MaintenanceUpdateRequest update(
      com.se1020.vehiclerental.maintenance.dto.MaintenanceResponse m, MaintenanceStatus status) {
    return new MaintenanceUpdateRequest(
        m.description(), m.startDate(), m.endDate(), m.cost(), status);
  }

  @Test
  void futureMaintenanceOnlyBlocksOverlappingDates() {
    as(admin);
    maintenanceService.create(request(10, 12));
    as(alice);
    book(2, 5);
    assertThatThrownBy(() -> book(9, 11)).isInstanceOf(BusinessException.class);
    book(12, 15);
  }

  @Test
  void overlappingMaintenanceRejected() {
    as(admin);
    maintenanceService.create(request(2, 4));
    assertThatThrownBy(() -> maintenanceService.create(request(3, 5)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void bookingsPreventOverlappingMaintenance() {
    book(1, 3);
    as(admin);
    assertThatThrownBy(() -> maintenanceService.create(request(2, 4)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void startsCompletesAndKeepsAdministrativeStatus() {
    as(admin);
    vehicleService.status(car.getId(), VehicleStatus.IN_MAINTENANCE);
    var m = maintenanceService.create(request(0, 2));
    maintenanceService.update(m.id(), update(m, MaintenanceStatus.IN_PROGRESS));
    assertThat(vehicles.require(car.getId()).getStatus()).isEqualTo(VehicleStatus.IN_MAINTENANCE);
    maintenanceService.update(m.id(), update(m, MaintenanceStatus.COMPLETED));
    assertThat(vehicles.require(car.getId()).getStatus()).isEqualTo(VehicleStatus.IN_MAINTENANCE);
  }

  @Test
  void futureMaintenanceCannotStartEarly() {
    as(admin);
    var m = maintenanceService.create(request(1, 3));
    assertThatThrownBy(
            () -> maintenanceService.update(m.id(), update(m, MaintenanceStatus.IN_PROGRESS)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void inProgressBlocksAllNewBookings() {
    as(admin);
    var m = maintenanceService.create(request(0, 2));
    maintenanceService.update(m.id(), update(m, MaintenanceStatus.IN_PROGRESS));
    as(alice);
    assertThatThrownBy(() -> book(10, 12)).isInstanceOf(BusinessException.class);
  }

  @Test
  void protectedCommitmentPreventsStartingMaintenance() {
    as(admin);
    var m = maintenanceService.create(request(0, 2));
    as(alice);
    book(3, 5);
    as(admin);
    assertThatThrownBy(
            () -> maintenanceService.update(m.id(), update(m, MaintenanceStatus.IN_PROGRESS)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void activeRentalPreventsMaintenanceEvenIfOverdue() {
    var b = book(0, 2);
    paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    as(admin);
    bookingService.status(b.getId(), BookingStatus.ACTIVE);
    clock.advanceDays(3);
    assertThatThrownBy(() -> maintenanceService.create(request(3, 5)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void scheduledCanBeModifiedAndCancelled() {
    as(admin);
    var m = maintenanceService.create(request(1, 3));
    var edited =
        maintenanceService.update(
            m.id(),
            new MaintenanceUpdateRequest(
                "Tyres",
                today.plusDays(2),
                today.plusDays(4),
                BigDecimal.TEN,
                MaintenanceStatus.SCHEDULED));
    assertThat(edited.description()).isEqualTo("Tyres");
    maintenanceService.cancel(m.id());
    assertThat(maintenance.require(m.id()).getStatus()).isEqualTo(MaintenanceStatus.CANCELLED);
  }

  @Test
  void cannotDeleteCompletedHistory() {
    as(admin);
    var m = maintenanceService.create(request(0, 2));
    maintenanceService.update(m.id(), update(m, MaintenanceStatus.IN_PROGRESS));
    maintenanceService.update(m.id(), update(m, MaintenanceStatus.COMPLETED));
    assertThatThrownBy(() -> maintenanceService.cancel(m.id()))
        .isInstanceOf(BusinessException.class);
  }
}
