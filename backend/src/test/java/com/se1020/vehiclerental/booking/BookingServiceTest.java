package com.se1020.vehiclerental.booking;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.dto.BookingDatesRequest;
import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.payment.PaymentMethod;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.support.Fixture;
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
    paymentService.create(new PaymentRequest(b.getId(), PaymentMethod.CASH_ON_PICKUP));
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
