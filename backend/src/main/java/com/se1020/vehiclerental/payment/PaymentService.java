package com.se1020.vehiclerental.payment;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.Booking;
import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.booking.BookingStatus;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.notification.NotificationService;
import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.payment.dto.PaymentResponse;
import com.se1020.vehiclerental.security.Access;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {
  private final PaymentRepository payments;
  private final BookingRepository bookings;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final NotificationService notifications;
  private final boolean mockSuccess;
  private final Clock clock;

  public PaymentService(
      PaymentRepository payments,
      BookingRepository bookings,
      StorageCoordinator coordinator,
      Access access,
      NotificationService notifications,
      @org.springframework.beans.factory.annotation.Value("${app.payment.mock-success}")
          boolean mockSuccess,
      Clock clock) {
    this.payments = payments;
    this.bookings = bookings;
    this.coordinator = coordinator;
    this.access = access;
    this.notifications = notifications;
    this.mockSuccess = mockSuccess;
    this.clock = clock;
  }

  public PaymentResponse create(PaymentRequest request) {
    var result =
        coordinator.locked(
            () -> {
              UUID owner = access.customer().getId();
              var b = bookings.require(request.bookingId());
              access.owner(b.getCustomerId());
              require(
                  b.getStatus() == BookingStatus.CONFIRMED,
                  "BOOKING_STATE",
                  "Payment requires a confirmed booking");
              requirePaymentCreationWindow(b);
              require(
                  payments.findAll().stream()
                      .noneMatch(
                          p ->
                              p.getBookingId().equals(b.getId())
                                  && (p.current() || p.getStatus() == PaymentStatus.REFUNDED)),
                  "DUPLICATE_PAYMENT",
                  "Booking already has a current or refunded payment");
              return PaymentResponse.from(
                  payments.save(
                      new Payment(
                          b.getId(),
                          owner,
                          b.getTotalAmount(),
                          request.paymentMethod(),
                          mockSuccess)));
            });
    notifications.deliverPending();
    return result;
  }

  public List<PaymentResponse> mine() {
    UUID id = access.customer().getId();
    return payments.findAll().stream()
        .filter(p -> p.getCustomerId().equals(id))
        .map(PaymentResponse::from)
        .toList();
  }

  public List<PaymentResponse> all() {
    access.admin();
    return payments.findAll().stream().map(PaymentResponse::from).toList();
  }

  public PaymentResponse get(UUID id) {
    var p = payments.require(id);
    access.ownerOrAdmin(p.getCustomerId());
    return PaymentResponse.from(p);
  }

  public PaymentResponse status(UUID id, PaymentStatus status) {
    var result =
        coordinator.locked(
            () -> {
              access.admin();
              var p = payments.require(id);
              var b = bookings.require(p.getBookingId());
              require(
                  b.getStatus() == BookingStatus.CONFIRMED,
                  "BOOKING_STATE",
                  "Payment updates require a confirmed booking");
              if (status == PaymentStatus.PAID) requireCashSettlementWindow(b);
              p.transitionPending(status);
              return PaymentResponse.from(payments.save(p));
            });
    notifications.deliverPending();
    return result;
  }

  /** A customer may record an eligible simulated payment any time before the exclusive return date. */
  private void requirePaymentCreationWindow(Booking booking) {
    LocalDate today = LocalDate.now(clock);
    require(
        today.isBefore(booking.getRentalPeriod().returnDate()),
        "PAYMENT_DATE",
        "Payment is allowed only before the booked rental interval ends");
  }

  /** Cash-on-pickup remains pending until pickup and cannot be collected after return. */
  private void requireCashSettlementWindow(Booking booking) {
    LocalDate today = LocalDate.now(clock);
    require(
        !today.isBefore(booking.getRentalPeriod().pickupDate())
            && today.isBefore(booking.getRentalPeriod().returnDate()),
        "PAYMENT_DATE",
        "Cash payment can be marked paid only within the booked rental interval");
  }
}
