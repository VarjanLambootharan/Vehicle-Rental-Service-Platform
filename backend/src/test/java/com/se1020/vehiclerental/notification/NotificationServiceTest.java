package com.se1020.vehiclerental.notification;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.BookingStatus;
import com.se1020.vehiclerental.payment.PaymentMethod;
import com.se1020.vehiclerental.payment.PaymentStatus;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.review.dto.ReviewRequest;
import com.se1020.vehiclerental.support.Fixture;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class NotificationServiceTest extends Fixture {

  @Test
  void bookingAndPaymentEventsMatchSavedState() {
    var b = book(1, 3);
    var p = paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
    assertThat(notificationService.list()).hasSize(2);
    assertThat(notificationService.list())
        .anyMatch(
            n ->
                n.notificationType() == NotificationType.PAYMENT_RECORDED
                    && n.message().contains("pending"));
    as(admin);
    paymentService.status(p.id(), PaymentStatus.PAID);
    as(alice);
    assertThat(notificationService.list())
        .anyMatch(n -> n.notificationType() == NotificationType.PAYMENT_PAID);
  }

  @Test
  void markReadAndReadAllPersist() {
    book(1, 3);
    book(3, 5);
    var first = notificationService.list().getFirst();
    notificationService.markRead(first.id());
    assertThat(notificationService.unreadCount()).isEqualTo(1);
    notificationService.markAllRead();
    wire();
    assertThat(notificationService.unreadCount()).isZero();
  }

  @Test
  void dismissalSurvivesRestartAndEventReplay() {
    var b = book(1, 3);
    var n = notificationService.list().getFirst();
    notificationService.dismiss(n.id());
    wire();
    notificationService.deliverPending();
    notificationService.deliverPending();
    assertThat(notificationService.list()).isEmpty();
    assertThat(notificationService.unreadCount()).isZero();
    assertThat(notificationRecords.findAll()).hasSize(1);
    assertThat(bookings.require(b.getId())).isNotNull();
  }

  @Test
  void dismissedNotificationCannotBeAccessedByAnotherUser() {
    book(1, 3);
    var n = notificationService.list().getFirst();
    as(bob);
    assertThatThrownBy(() -> notificationService.dismiss(n.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> notificationService.markRead(n.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  }

  @Test
  void failedNotificationWriteDoesNotUndoBookingAndRetryDelivers() {
    store.failOnWrite("notifications", 1);
    var b = book(1, 3);
    assertThat(bookings.require(b.getId()).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(notificationRecords.findAll()).isEmpty();
    wire();
    notificationService.deliverPending();
    assertThat(notificationService.list()).hasSize(1);
  }

  @Test
  void replayNeverDuplicates() {
    completedBooking();
    for (int i = 0; i < 3; i++) notificationService.deliverPending();
    assertThat(notificationRecords.findAll()).hasSize(4);
    assertThat(notificationRecords.findAll().stream().map(Notification::getEventId))
        .doesNotHaveDuplicates();
  }

  @Test
  void dismissAllAffectsOnlyCurrentUser() {
    book(1, 3);
    as(bob);
    book(3, 5);
    notificationService.dismissAll();
    assertThat(notificationService.list()).isEmpty();
    as(alice);
    assertThat(notificationService.list()).hasSize(1);
  }

  @Test
  void reviewSubmissionProducesNotification() {
    var b = completedBooking();
    reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great"));
    assertThat(notificationService.list())
        .anyMatch(n -> n.notificationType() == NotificationType.REVIEW_SUBMITTED);
  }
}
