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
    assertThat(notificationService.list())
        .noneMatch(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
  }

  @Test
  void pendingPaymentIsVoided() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.CASH_ON_PICKUP);
    cancellationService.cancel(b.getId());
    assertThat(payments.require(p.getId()).getStatus()).isEqualTo(PaymentStatus.VOIDED);
    assertThat(notificationService.list())
        .noneMatch(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
  }

  @Test
  void paidCancellationRefundsOnceAndReportsActualAmount() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    cancellationService.cancel(b.getId());
    var first = payments.require(p.getId());
    cancellationService.cancel(b.getId());
    var second = payments.require(p.getId());
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
    var p = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    store.failOnWrite("bookings", 1);
    assertThatThrownBy(() -> cancellationService.cancel(b.getId()))
        .isInstanceOf(StorageException.class);
    assertThat(bookings.require(b.getId()).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(payments.require(p.getId()).getStatus()).isEqualTo(PaymentStatus.PAID);
  }

  @Test
  void failedPaymentWriteKeepsDatesBlockedAndRecoversAfterRestart() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    store.failOnWrite("payments", 1);
    assertThat(cancellationService.cancel(b.getId()).status())
        .isEqualTo(BookingStatus.CANCELLATION_PENDING);
    assertThatThrownBy(() -> book(1, 3)).isInstanceOf(BusinessException.class);
    assertThat(notificationRecords.findAll())
        .noneMatch(n -> n.getNotificationType() == NotificationType.BOOKING_CANCELLED);
    assertThat(notificationService.list())
        .noneMatch(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
    wire();
    cancellationService.recoverPending();
    notificationService.deliverPending();
    assertThat(bookings.require(b.getId()).getStatus()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(payments.require(p.getId()).getStatus()).isEqualTo(PaymentStatus.REFUNDED);
  }

  @Test
  void finalBookingWriteFailureResumesWithoutRefundingTwice() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    store.failOnWrite("bookings", 2);
    assertThat(cancellationService.cancel(b.getId()).status())
        .isEqualTo(BookingStatus.CANCELLATION_PENDING);
    var refund = payments.require(p.getId());
    assertThat(notificationService.list())
        .noneMatch(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
    var workflow = bookings.require(b.getId()).getCancellationWorkflow().getWorkflowId();
    wire();
    assertThat(cancellationService.cancel(b.getId()).status()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(payments.require(p.getId()).getRefundedAt()).isEqualTo(refund.getRefundedAt());
    assertThat(bookings.require(b.getId()).getCancellationWorkflow().getWorkflowId())
        .isEqualTo(workflow);
    assertThat(notificationService.list())
        .filteredOn(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED)
        .hasSize(1);
  }

  @Test
  void refundNoticeUsesPersistedAmountBookingAndOwnerAndDoesNotReappearAfterDismissal() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    cancellationService.cancel(b.getId());
    var notice =
        notificationService.list().stream()
            .filter(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED)
            .findFirst()
            .orElseThrow();
    assertThat(notice.title()).isEqualTo("Demo Refund Completed");
    assertThat(notice.relatedEntityId()).isEqualTo(b.getId());
    assertThat(notice.recipientUserId()).isEqualTo(alice.getId());
    assertThat(notice.message())
        .contains(
            "simulated refund of LKR 15000.00",
            b.getId().toString(),
            "No actual bank transfer has occurred.");
    assertThat(payments.require(p.getId()).getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    as(bob);
    assertThat(notificationService.list()).isEmpty();
    as(alice);
    notificationService.markRead(notice.id());
    notificationService.dismiss(notice.id());
    wire();
    cancellationService.cancel(b.getId());
    cancellationService.recoverPending();
    notificationService.deliverPending();
    assertThat(notificationService.list())
        .noneMatch(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
    assertThat(notificationRecords.findAll())
        .noneMatch(n -> n.getNotificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
  }

  @Test
  void refundNotificationWriteFailureRecoversOnlyOnceAfterRestart() {
    var b = book(1, 3);
    persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    store.failOnWrite("notifications", 1);
    assertThat(cancellationService.cancel(b.getId()).status()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(notificationService.list())
        .noneMatch(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED);
    wire();
    cancellationService.recoverPending();
    notificationService.deliverPending();
    notificationService.deliverPending();
    assertThat(notificationService.list())
        .filteredOn(n -> n.notificationType() == NotificationType.SIMULATED_REFUND_COMPLETED)
        .hasSize(1);
  }

  @Test
  void pendingVoidRecoveryIsIdempotent() {
    var b = book(1, 3);
    var p = persistedPayment(b, PaymentMethod.CASH_ON_PICKUP);
    store.failOnWrite("bookings", 2);
    cancellationService.cancel(b.getId());
    var stamp = payments.require(p.getId()).getUpdatedAt();
    wire();
    cancellationService.recoverPending();
    cancellationService.recoverPending();
    assertThat(payments.require(p.getId()).getUpdatedAt()).isEqualTo(stamp);
  }

  @Test
  void historicalFailedAttemptsArePreserved() {
    var b = book(1, 3);
    var first = persistedPayment(b, PaymentMethod.CASH_ON_PICKUP);
    as(admin);
    paymentService.status(first.getId(), PaymentStatus.FAILED);
    as(alice);
    var second = persistedPayment(b, PaymentMethod.MOCK_ONLINE);
    cancellationService.cancel(b.getId());
    assertThat(payments.findAll()).hasSize(2);
    assertThat(payments.require(first.getId()).getStatus()).isEqualTo(PaymentStatus.FAILED);
    assertThat(payments.require(second.getId()).getStatus()).isEqualTo(PaymentStatus.REFUNDED);
  }
}
