package com.se1020.vehiclerental.booking;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.common.storage.StorageException;
import com.se1020.vehiclerental.notification.NotificationType;
import com.se1020.vehiclerental.payment.PaymentMethod;
import com.se1020.vehiclerental.payment.PaymentStatus;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.support.Fixture;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class CancellationRecoveryTest extends Fixture {

  @Test
  void cancellationWithoutPaymentReleasesDates() {
    var b = book(1, 3);
    assertThat(cancellationService.cancel(b.getId()).status()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(book(1, 3)).isNotNull();
  }

  @Test
  void pendingPaymentIsVoided() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    cancellationService.cancel(b.getId());
    assertThat(payments.require(p.id()).getStatus()).isEqualTo(PaymentStatus.VOIDED);
  }

  @Test
  void paidCancellationRefundsOnceAndReportsActualAmount() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    cancellationService.cancel(b.getId());
    var first = payments.require(p.id());
    cancellationService.cancel(b.getId());
    var second = payments.require(p.id());
    assertThat(second.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    assertThat(second.getSimulatedRefundReference()).isEqualTo(first.getSimulatedRefundReference());
    assertThat(second.getRefundedAt()).isEqualTo(first.getRefundedAt());
    assertThat(
            notificationRecords.findAll().stream()
                .filter(n -> n.getNotificationType() == NotificationType.BOOKING_CANCELLED)
                .toList())
        .singleElement()
        .satisfies(
            n -> assertThat(n.getMessage()).contains("Toyota Aqua", "15000.00", "simulation only"));
  }

  @Test
  void activeRentalCannotBeCancelled() {
    var b = book(0, 2);
    paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    as(admin);
    bookingService.status(b.getId(), BookingStatus.ACTIVE);
    assertThatThrownBy(() -> cancellationService.cancel(b.getId()))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void initialIntentWriteFailureDoesNotTouchPayment() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    store.failOnWrite("bookings", 1);
    assertThatThrownBy(() -> cancellationService.cancel(b.getId()))
        .isInstanceOf(StorageException.class);
    assertThat(bookings.require(b.getId()).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(payments.require(p.id()).getStatus()).isEqualTo(PaymentStatus.PAID);
  }

  @Test
  void failedPaymentWriteKeepsDatesBlockedAndRecoversAfterRestart() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    store.failOnWrite("payments", 1);
    assertThat(cancellationService.cancel(b.getId()).status())
        .isEqualTo(BookingStatus.CANCELLATION_PENDING);
    assertThatThrownBy(() -> book(1, 3)).isInstanceOf(BusinessException.class);
    assertThat(notificationRecords.findAll())
        .noneMatch(n -> n.getNotificationType() == NotificationType.BOOKING_CANCELLED);
    wire();
    cancellationService.recoverPending();
    notificationService.deliverPending();
    assertThat(bookings.require(b.getId()).getStatus()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(payments.require(p.id()).getStatus()).isEqualTo(PaymentStatus.REFUNDED);
  }

  @Test
  void finalBookingWriteFailureResumesWithoutRefundingTwice() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    store.failOnWrite("bookings", 2);
    assertThat(cancellationService.cancel(b.getId()).status())
        .isEqualTo(BookingStatus.CANCELLATION_PENDING);
    var refund = payments.require(p.id());
    var workflow = bookings.require(b.getId()).getCancellationWorkflow().getWorkflowId();
    wire();
    assertThat(cancellationService.cancel(b.getId()).status()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(payments.require(p.id()).getRefundedAt()).isEqualTo(refund.getRefundedAt());
    assertThat(bookings.require(b.getId()).getCancellationWorkflow().getWorkflowId())
        .isEqualTo(workflow);
  }

  @Test
  void pendingVoidRecoveryIsIdempotent() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    store.failOnWrite("bookings", 2);
    cancellationService.cancel(b.getId());
    var stamp = payments.require(p.id()).getUpdatedAt();
    wire();
    cancellationService.recoverPending();
    cancellationService.recoverPending();
    assertThat(payments.require(p.id()).getUpdatedAt()).isEqualTo(stamp);
  }

  @Test
  void historicalFailedAttemptsArePreserved() {
    var b = book(1, 3);
    var first = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    as(admin);
    paymentService.status(first.id(), PaymentStatus.FAILED);
    as(alice);
    var second = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.MOCK_ONLINE));
    cancellationService.cancel(b.getId());
    assertThat(payments.findAll()).hasSize(2);
    assertThat(payments.require(first.id()).getStatus()).isEqualTo(PaymentStatus.FAILED);
    assertThat(payments.require(second.id()).getStatus()).isEqualTo(PaymentStatus.REFUNDED);
  }
}
