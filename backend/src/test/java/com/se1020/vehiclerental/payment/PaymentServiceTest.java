package com.se1020.vehiclerental.payment;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.support.Fixture;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class PaymentServiceTest extends Fixture {

  @Test
  void paymentCreationBeforePickupIsAllowedButCashCollectionRemainsPending() {
    var cashBooking = book(1, 3);
    var onlineBooking = book(4, 6);
    assertThat(
            paymentService.create(
                new PaymentRequest(cashBooking.getId(), PaymentMethod.CASH_ON_PICKUP)).status())
        .isEqualTo(PaymentStatus.PENDING);
    assertThat(
            paymentService.create(
                new PaymentRequest(onlineBooking.getId(), PaymentMethod.MOCK_ONLINE)).status())
        .isEqualTo(PaymentStatus.PAID);
    assertThat(
            new PaymentRepository(new TextFileStore(directory.toString(), new StorageCoordinator()))
                .findAll())
        .hasSize(2);
  }

  @Test
  void administratorCannotCollectPendingCashBeforePickup() {
    var booking = book(1, 3);
    var pending =
        payments.save(
            new Payment(
                booking.getId(),
                alice.getId(),
                booking.getTotalAmount(),
                PaymentMethod.CASH_ON_PICKUP,
                true));
    as(admin);
    assertThatThrownBy(() -> paymentService.status(pending.getId(), PaymentStatus.PAID))
        .isInstanceOfSatisfying(
            BusinessException.class,
            error -> assertThat(error.getCode()).isEqualTo("PAYMENT_DATE"));
    assertThat(payments.require(pending.getId()).getStatus()).isEqualTo(PaymentStatus.PENDING);
  }

  @Test
  void pendingAmountComesFromBooking() {
    var b = book(0, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    assertThat(p.amount()).isEqualByComparingTo(b.getTotalAmount());
    assertThat(p.status()).isEqualTo(PaymentStatus.PENDING);
  }

  @Test
  void mockSuccessAndConfiguredFailure() {
    var b = book(0, 3);
    var failureService =
        new PaymentService(payments, bookings, lock, access, notificationService, false, clock);
    assertThat(
            failureService
                .create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE))
                .status())
        .isEqualTo(PaymentStatus.FAILED);
    assertThat(
            paymentService
                .create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE))
                .status())
        .isEqualTo(PaymentStatus.PAID);
  }

  @Test
  void pendingCanBecomePaid() {
    var p =
        paymentService.create(new PaymentRequest(book(0, 3).getId(), PaymentMethod.CASH_ON_PICKUP));
    as(admin);
    assertThat(paymentService.status(p.id(), PaymentStatus.PAID).status())
        .isEqualTo(PaymentStatus.PAID);
  }

  @Test
  void pendingCanFailAndRetry() {
    var b = book(0, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    as(admin);
    paymentService.status(p.id(), PaymentStatus.FAILED);
    as(alice);
    assertThat(
            paymentService
                .create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE))
                .status())
        .isEqualTo(PaymentStatus.PAID);
  }

  @Test
  void adminCanVoidPending() {
    var p =
        paymentService.create(new PaymentRequest(book(0, 3).getId(), PaymentMethod.CASH_ON_PICKUP));
    as(admin);
    assertThat(paymentService.status(p.id(), PaymentStatus.VOIDED).status())
        .isEqualTo(PaymentStatus.VOIDED);
    assertThat(payments.findAll()).hasSize(1);
  }

  @Test
  void duplicateCurrentPaymentRejected() {
    var b = book(0, 3);
    paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    assertThatThrownBy(
            () -> paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void directRefundAndCustomerStatusUpdatesRejected() {
    var p =
        paymentService.create(new PaymentRequest(book(0, 3).getId(), PaymentMethod.MOCK_ONLINE));
    assertThatThrownBy(() -> paymentService.status(p.id(), PaymentStatus.REFUNDED))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    as(admin);
    assertThatThrownBy(() -> paymentService.status(p.id(), PaymentStatus.REFUNDED))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void anotherCustomerCannotPayOrRead() {
    var b = book(0, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    as(bob);
    assertThatThrownBy(
            () -> paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE)))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> paymentService.get(p.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  }

  @Test
  void refundedBookingCannotBePaidAgain() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    cancellationService.cancel(b.getId());
    assertThatThrownBy(
            () -> paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE)))
        .isInstanceOf(BusinessException.class);
    as(admin);
    assertThatThrownBy(() -> paymentService.status(p.getId(), PaymentStatus.PAID))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void paymentWithinBookedIntervalMayBeRecordedAfterPickup() {
    var booking = book(0, 2);
    clock.advanceDays(1);
    assertThat(
            paymentService
                .create(new PaymentRequest(booking.getId(), PaymentMethod.MOCK_ONLINE))
                .status())
        .isEqualTo(PaymentStatus.PAID);
    as(admin);
    assertThat(
            bookingService
                .status(booking.getId(), com.se1020.vehiclerental.booking.BookingStatus.ACTIVE)
                .status())
        .isEqualTo(com.se1020.vehiclerental.booking.BookingStatus.ACTIVE);
  }

  @Test
  void pickupTodayCanBePaidButReturnDateAndLaterCannot() {
    var todayBooking = book(0, 2);
    assertThat(
            paymentService
                .create(new PaymentRequest(todayBooking.getId(), PaymentMethod.CASH_ON_PICKUP))
                .status())
        .isEqualTo(PaymentStatus.PENDING);
    clock.advanceDays(2);
    as(admin);
    assertThatThrownBy(
            () -> paymentService.status(payments.findAll().getFirst().getId(), PaymentStatus.PAID))
        .isInstanceOf(BusinessException.class);
    paymentService.status(payments.findAll().getFirst().getId(), PaymentStatus.VOIDED);
    as(alice);
    assertThatThrownBy(
            () ->
                paymentService.create(
                    new PaymentRequest(todayBooking.getId(), PaymentMethod.MOCK_ONLINE)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("booked rental interval");
    clock.advanceDays(1);
    assertThatThrownBy(
            () ->
                paymentService.create(
                    new PaymentRequest(todayBooking.getId(), PaymentMethod.CASH_ON_PICKUP)))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void voidedPaymentCanBeRetriedDuringRental() {
    var booking = book(0, 2);
    var pending =
        paymentService.create(
            new PaymentRequest(booking.getId(), PaymentMethod.CASH_ON_PICKUP));
    as(admin);
    paymentService.status(pending.id(), PaymentStatus.VOIDED);
    as(alice);
    assertThat(
            paymentService
                .create(new PaymentRequest(booking.getId(), PaymentMethod.MOCK_ONLINE))
                .status())
        .isEqualTo(PaymentStatus.PAID);
  }

  @Test
  void cancelledAndCompletedBookingsRemainIneligible() {
    var cancelled = book(1, 3);
    cancellationService.cancel(cancelled.getId());
    assertThatThrownBy(
            () ->
                paymentService.create(
                    new PaymentRequest(cancelled.getId(), PaymentMethod.MOCK_ONLINE)))
        .isInstanceOfSatisfying(
            BusinessException.class,
            error -> assertThat(error.getCode()).isEqualTo("BOOKING_STATE"));

    var completed = book(0, 2);
    paymentService.create(new PaymentRequest(completed.getId(), PaymentMethod.MOCK_ONLINE));
    as(admin);
    bookingService.status(
        completed.getId(), com.se1020.vehiclerental.booking.BookingStatus.ACTIVE);
    bookingService.status(
        completed.getId(), com.se1020.vehiclerental.booking.BookingStatus.COMPLETED);
    as(alice);
    assertThatThrownBy(
            () ->
                paymentService.create(
                    new PaymentRequest(completed.getId(), PaymentMethod.CASH_ON_PICKUP)))
        .isInstanceOfSatisfying(
            BusinessException.class,
            error -> assertThat(error.getCode()).isEqualTo("BOOKING_STATE"));
  }
}
