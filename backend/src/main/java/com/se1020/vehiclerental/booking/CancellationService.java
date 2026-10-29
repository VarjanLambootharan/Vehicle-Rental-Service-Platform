package com.se1020.vehiclerental.booking;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.dto.BookingResponse;
import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.common.storage.StorageException;
import com.se1020.vehiclerental.notification.NotificationService;
import com.se1020.vehiclerental.payment.Payment;
import com.se1020.vehiclerental.payment.PaymentRepository;
import com.se1020.vehiclerental.payment.PaymentStatus;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.VehicleRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CancellationService {
  private final BookingRepository bookings;
  private final PaymentRepository payments;
  private final VehicleRepository vehicles;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final Clock clock;
  private final NotificationService notifications;

  public CancellationService(
      BookingRepository bookings,
      PaymentRepository payments,
      VehicleRepository vehicles,
      StorageCoordinator coordinator,
      Access access,
      Clock clock,
      NotificationService notifications) {
    this.bookings = bookings;
    this.payments = payments;
    this.vehicles = vehicles;
    this.coordinator = coordinator;
    this.access = access;
    this.clock = clock;
    this.notifications = notifications;
  }

  private static final org.slf4j.Logger LOG =
      org.slf4j.LoggerFactory.getLogger(CancellationService.class);

  public BookingResponse cancel(UUID id) {
    var result =
        coordinator.locked(
            () -> {
              var b = bookings.require(id);
              access.ownerOrAdmin(b.getCustomerId());
              if (b.getStatus() == BookingStatus.CANCELLED) return BookingResponse.from(b);
              if (b.getStatus() != BookingStatus.CANCELLATION_PENDING) {
                require(
                    b.getStatus() == BookingStatus.CONFIRMED
                        && b.getRentalPeriod().pickupDate().isAfter(LocalDate.now(clock)),
                    "BOOKING_STATE",
                    "Cancel only confirmed bookings before pickup");
                var current =
                    payments.findAll().stream()
                        .filter(p -> p.getBookingId().equals(id) && p.current())
                        .toList();
                require(
                    current.size() <= 1,
                    "PAYMENT_INTEGRITY",
                    "Multiple current payments require administrator recovery");
                Payment p = current.isEmpty() ? null : current.getFirst();
                var action =
                    p == null
                        ? CancellationWorkflow.PaymentAction.NONE
                        : (p.getStatus() == PaymentStatus.PAID
                            ? CancellationWorkflow.PaymentAction.REFUND
                            : CancellationWorkflow.PaymentAction.VOID);
                b.requestCancellation(
                    new CancellationWorkflow(
                        id,
                        p == null ? null : p.getId(),
                        action,
                        p == null ? null : p.getAmount()));
                bookings.save(b); // Durable intent precedes every payment modification.
              }
              try {
                return BookingResponse.from(resume(id));
              } catch (StorageException e) {
                LOG.warn("Cancellation {} is durably pending and will be retried", id);
                return BookingResponse.from(b);
              }
            });
    notifications.deliverPending();
    return result;
  }

  private Booking resume(UUID id) {
    var b = bookings.require(id);
    if (b.getStatus() != BookingStatus.CANCELLATION_PENDING) return b;
    var workflow = b.getCancellationWorkflow();
    require(
        workflow != null && workflow.getBookingId().equals(id),
        "CANCELLATION_INTEGRITY",
        "Missing or invalid cancellation workflow");
    String title = "Booking Cancelled",
        message =
            "Your booking has been cancelled. No payment was made, so no refund was required.";
    if (workflow.getRequiredPaymentAction() != CancellationWorkflow.PaymentAction.NONE) {
      var p = payments.require(workflow.getOriginalPaymentId());
      require(
          p.getBookingId().equals(id)
              && p.getAmount().compareTo(workflow.getOriginalPaymentAmount()) == 0,
          "CANCELLATION_INTEGRITY",
          "Cancellation payment reference or amount mismatch");
      boolean refund =
          workflow.getRequiredPaymentAction() == CancellationWorkflow.PaymentAction.REFUND;
      if (!workflow.getWorkflowId().equals(p.getProcessedWorkflowId())) {
        p.settleCancellation(workflow.getWorkflowId(), refund);
        payments.save(p);
      } else
        require(
            p.getStatus() == (refund ? PaymentStatus.REFUNDED : PaymentStatus.VOIDED),
            "CANCELLATION_INTEGRITY",
            "Workflow payment state mismatch");
      if (refund) {
        var vehicle = vehicles.require(b.getVehicleId());
        title = "Booking Cancelled — Refund Completed";
        message =
            "Your booking for "
                + vehicle.getBrand()
                + " "
                + vehicle.getModel()
                + " has been cancelled. LKR "
                + p.getAmount().toPlainString()
                + " has been refunded (simulation only — no real money was transferred).";
      } else
        message =
            "Your booking has been cancelled. Your pending payment was voided. No refund was"
                + " required.";
    }
    b.finishCancellation(title, message);
    return bookings.save(b);
  }

  public void recoverPending() {
    coordinator.locked(
        () -> {
          for (var b : bookings.findAll())
            if (b.getStatus() == BookingStatus.CANCELLATION_PENDING) {
              try {
                resume(b.getId());
              } catch (StorageException | BusinessException e) {
                LOG.warn(
                    "Cancellation {} remains pending: {}", b.getId(), e.getClass().getSimpleName());
              }
            }
        });
  }
}
