package com.se1020.vehiclerental.booking;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.dto.BookingDatesRequest;
import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.payment.PaymentMethod;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.support.Fixture;
import com.se1020.vehiclerental.vehicle.Motorcycle;
import com.se1020.vehiclerental.vehicle.ThreeWheeler;
import com.se1020.vehiclerental.vehicle.Van;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class BookingServiceTest extends Fixture {

  @Test
  void confirmsAndCalculatesPrice() {
    var b = book(1, 3);
    assertThat(b.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(b.getTotalAmount()).isEqualByComparingTo("15000");
    assertThat(b.getEvents()).hasSize(1);
  }

  @Test
  void everyVehicleCategoryCanBeBookedWhenAvailable() {
    var van =
        vehicles.save(new Van("VAN-100", "Toyota", "Hiace", BigDecimal.TEN, "Van", 12, "MANUAL"));
    var bike =
        vehicles.save(new Motorcycle("BIKE-100", "Honda", "CB", BigDecimal.TEN, "Bike", 150));
    var threeWheeler =
        vehicles.save(new ThreeWheeler("TUK-100", "Bajaj", "RE", BigDecimal.TEN, "Tuk", 200));
    var vehicleIds = List.of(car.getId(), van.getId(), bike.getId(), threeWheeler.getId());

    for (UUID vehicleId : vehicleIds)
      assertThat(
              bookingService
                  .create(
                      new com.se1020.vehiclerental.booking.dto.BookingRequest(
                          vehicleId, today.plusDays(1), today.plusDays(2)))
                  .status())
          .isEqualTo(BookingStatus.CONFIRMED);
  }

  @Test
  void invalidAndPastDatesRejected() {
    assertThatThrownBy(() -> book(2, 2)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> book(-1, 2)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void overlapRejectedAndAdjacentAccepted() {
    book(1, 3);
    assertThatThrownBy(() -> book(2, 4)).isInstanceOf(BusinessException.class);
    assertThat(book(3, 5).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
  }

  @Test
  void rejectsPartialContainedAndContainingIntervalsWithoutPersistingASecondBooking() {
    var original = book(4, 10);
    var conflicts =
        List.of(
            new RentalPeriod(today.plusDays(2), today.plusDays(6)),
            new RentalPeriod(today.plusDays(5), today.plusDays(8)),
            new RentalPeriod(today.plusDays(2), today.plusDays(12)),
            new RentalPeriod(today.plusDays(8), today.plusDays(12)));

    for (var period : conflicts)
      assertThatThrownBy(
              () ->
                  bookingService.create(
                      new com.se1020.vehiclerental.booking.dto.BookingRequest(
                          car.getId(), period.pickupDate(), period.returnDate())))
          .isInstanceOf(BusinessException.class)
          .hasMessageContaining("unavailable");

    assertThat(bookings.findAll()).singleElement().satisfies(saved -> {
      assertThat(saved.getId()).isEqualTo(original.getId());
      assertThat(saved.getRentalPeriod()).isEqualTo(original.getRentalPeriod());
      assertThat(saved.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    });
    assertThat(payments.findAll()).isEmpty();
    assertThat(availability.available(car.getId(), original.getRentalPeriod(), null)).isFalse();
  }

  @Test
  void permitsSeparatedAndDifferentVehicleReservations() {
    var first = book(1, 3);
    var adjacent = book(3, 5);
    var van =
        vehicles.save(
            new Van("VAN-SAME-DATES", "Toyota", "Hiace", BigDecimal.TEN, "Van", 10, "AUTO"));
    var differentVehicle =
        bookingService.create(
            new com.se1020.vehiclerental.booking.dto.BookingRequest(
                van.getId(), today.plusDays(1), today.plusDays(3)));

    assertThat(adjacent.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(differentVehicle.status()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(bookings.findAll())
        .extracting(Booking::getId)
        .containsExactlyInAnyOrder(first.getId(), adjacent.getId(), differentVehicle.id());
  }

  @Test
  void conflictingDateModificationLeavesTheExistingBookingUntouched() {
    book(4, 10);
    var editable = book(11, 13);

    assertThatThrownBy(
            () ->
                bookingService.update(
                    editable.getId(),
                    new BookingDatesRequest(today.plusDays(6), today.plusDays(9))))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("unavailable");

    assertThat(bookings.require(editable.getId()).getRentalPeriod())
        .isEqualTo(new RentalPeriod(today.plusDays(11), today.plusDays(13)));
    assertThat(bookings.findAll()).hasSize(2);
  }

  @Test
  void modificationUsesSavedRate() {
    var b = book(1, 3);
    as(admin);
    vehicleService.update(car.getId(), carRequest("CAR-100", BigDecimal.ONE));
    as(alice);
    var updated =
        bookingService.update(
            b.getId(), new BookingDatesRequest(today.plusDays(1), today.plusDays(4)));
    assertThat(updated.totalAmount()).isEqualByComparingTo("22500");
  }

  @Test
  void pendingPaymentPreventsDateChange() {
    var b = book(1, 3);
    persistedPayment(b, PaymentMethod.CASH_ON_PICKUP);
    assertThatThrownBy(
            () ->
                bookingService.update(
                    b.getId(), new BookingDatesRequest(today.plusDays(1), today.plusDays(4))))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void anotherOwnerCannotReadOrModifyBooking() {
    var b = book(1, 3);
    as(bob);
    assertThatThrownBy(() -> bookingService.get(b.getId()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(
            () ->
                bookingService.update(
                    b.getId(), new BookingDatesRequest(today.plusDays(3), today.plusDays(5))))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  }

  @Test
  void startRequiresPaidAndCorrectDate() {
    var b = book(0, 2);
    as(admin);
    assertThatThrownBy(() -> bookingService.status(b.getId(), BookingStatus.ACTIVE))
        .isInstanceOf(BusinessException.class);
    as(alice);
    paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    as(admin);
    assertThat(bookingService.status(b.getId(), BookingStatus.ACTIVE).status())
        .isEqualTo(BookingStatus.ACTIVE);
    assertThat(bookingService.status(b.getId(), BookingStatus.COMPLETED).status())
        .isEqualTo(BookingStatus.COMPLETED);
    assertThatThrownBy(() -> bookingService.status(b.getId(), BookingStatus.ACTIVE))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void activeRentalBlocksAnotherRentalEvenWhenDatesDoNotOverlapAndItIsOverdue() {
    var active = book(0, 1);
    var existingFutureBooking = book(4, 6); // A valid reservation made before the rental starts.
    paymentService.create(new PaymentRequest(active.getId(), PaymentMethod.MOCK_ONLINE));
    as(admin);
    bookingService.status(active.getId(), BookingStatus.ACTIVE);
    clock.advanceDays(2); // The active rental is now overdue.
    as(alice);
    assertThatThrownBy(() -> book(8, 10)).isInstanceOf(BusinessException.class);
    assertThat(bookings.require(existingFutureBooking.getId()).getStatus())
        .isEqualTo(BookingStatus.CONFIRMED);
  }

  @Test
  void overdueActiveRentalBlocksIssuingAnExistingPaidReservation() {
    var first = book(0, 1);
    var next = book(2, 4);
    paymentService.create(new PaymentRequest(first.getId(), PaymentMethod.MOCK_ONLINE));
    persistedPayment(next, PaymentMethod.MOCK_ONLINE);
    as(admin);
    bookingService.status(first.getId(), BookingStatus.ACTIVE);
    clock.advanceDays(2);
    assertThatThrownBy(() -> bookingService.status(next.getId(), BookingStatus.ACTIVE))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("unavailable");
    assertThat(bookings.findAll())
        .filteredOn(b -> b.getStatus() == BookingStatus.ACTIVE)
        .hasSize(1);
    bookingService.status(first.getId(), BookingStatus.COMPLETED);
    assertThat(bookingService.status(next.getId(), BookingStatus.ACTIVE).status())
        .isEqualTo(BookingStatus.ACTIVE);
  }

  @Test
  void administratorCanResolveExpiredConfirmedBookingAsNoShowAndVoidCashPayment() {
    var booking = book(1, 2);
    var payment = persistedPayment(booking, PaymentMethod.CASH_ON_PICKUP);
    clock.advanceDays(3);
    as(admin);
    assertThat(bookingService.status(booking.getId(), BookingStatus.NO_SHOW).status())
        .isEqualTo(BookingStatus.NO_SHOW);
    assertThat(payments.require(payment.getId()).getStatus())
        .isEqualTo(com.se1020.vehiclerental.payment.PaymentStatus.VOIDED);
    as(alice);
    assertThatThrownBy(
            () ->
                paymentService.create(
                    new PaymentRequest(booking.getId(), PaymentMethod.MOCK_ONLINE)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void existingNoShowPolicyPreservesPaidHistoryAndReleasesAdministrativeGuards() {
    var booking = book(1, 2);
    var paid = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    as(admin);
    assertThatThrownBy(() -> bookingService.status(booking.getId(), BookingStatus.NO_SHOW))
        .isInstanceOf(BusinessException.class);
    clock.advanceDays(2);
    as(alice);
    assertThatThrownBy(() -> bookingService.status(booking.getId(), BookingStatus.NO_SHOW))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    as(admin);
    bookingService.status(booking.getId(), BookingStatus.NO_SHOW);
    assertThat(payments.require(paid.getId()).getStatus())
        .isEqualTo(com.se1020.vehiclerental.payment.PaymentStatus.PAID);
    vehicleService.status(car.getId(), com.se1020.vehiclerental.vehicle.VehicleStatus.INACTIVE);
    assertThat(customerService.active(alice.getId(), false).active()).isFalse();
  }

  @Test
  void noShowCanRetryAfterPendingVoidAndFinalBookingWriteFailure() {
    var booking = book(1, 2);
    var pending = persistedPayment(booking, PaymentMethod.CASH_ON_PICKUP);
    clock.advanceDays(2);
    as(admin);
    store.failOnWrite("bookings", 1);
    assertThatThrownBy(() -> bookingService.status(booking.getId(), BookingStatus.NO_SHOW))
        .isInstanceOf(com.se1020.vehiclerental.common.storage.StorageException.class);
    assertThat(bookings.require(booking.getId()).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(payments.require(pending.getId()).getStatus())
        .isEqualTo(com.se1020.vehiclerental.payment.PaymentStatus.VOIDED);
    wire();
    assertThat(bookingService.status(booking.getId(), BookingStatus.NO_SHOW).status())
        .isEqualTo(BookingStatus.NO_SHOW);
  }

  @Test
  void concurrentRequestsProduceOnlyOneReservation() throws Exception {
    try (var pool = java.util.concurrent.Executors.newFixedThreadPool(8)) {
      var start = new java.util.concurrent.CountDownLatch(1);
      var tasks = new ArrayList<java.util.concurrent.Future<Boolean>>();
      for (int i = 0; i < 8; i++)
        tasks.add(
            pool.submit(
                () -> {
                  as(alice);
                  start.await();
                  try {
                    book(1, 3);
                    return true;
                  } catch (BusinessException e) {
                    return false;
                  } finally {
                    org.springframework.security.core.context.SecurityContextHolder.clearContext();
                  }
                }));
      start.countDown();
      int successes = 0;
      for (var f : tasks) if (f.get()) successes++;
      assertThat(successes).isEqualTo(1);
      assertThat(bookings.findAll()).hasSize(1);
    }
  }
}
