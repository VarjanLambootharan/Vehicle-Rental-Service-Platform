package com.se1020.vehiclerental.config;

import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.booking.CancellationService;
import com.se1020.vehiclerental.common.storage.StorageException;
import com.se1020.vehiclerental.maintenance.MaintenanceRepository;
import com.se1020.vehiclerental.notification.NotificationRepository;
import com.se1020.vehiclerental.notification.NotificationService;
import com.se1020.vehiclerental.payment.PaymentRepository;
import com.se1020.vehiclerental.review.ReviewRepository;
import com.se1020.vehiclerental.vehicle.VehicleRepository;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class RecoveryRunner implements ApplicationRunner {
  private final CancellationService cancellations;
  private final NotificationService notifications;
  private final VehicleRepository vehicles;
  private final BookingRepository bookings;
  private final PaymentRepository payments;
  private final MaintenanceRepository maintenance;
  private final ReviewRepository reviews;
  private final NotificationRepository notificationRecords;
  private volatile boolean started;

  public RecoveryRunner(
      CancellationService cancellations,
      NotificationService notifications,
      VehicleRepository vehicles,
      BookingRepository bookings,
      PaymentRepository payments,
      MaintenanceRepository maintenance,
      ReviewRepository reviews,
      NotificationRepository notificationRecords) {
    this.cancellations = cancellations;
    this.notifications = notifications;
    this.vehicles = vehicles;
    this.bookings = bookings;
    this.payments = payments;
    this.maintenance = maintenance;
    this.reviews = reviews;
    this.notificationRecords = notificationRecords;
  }

  @Override
  public void run(ApplicationArguments args) {
    // Force typed reads before accepting startup as healthy. Existing corrupt stores fail startup.
    vehicles.findAll();
    bookings.findAll();
    payments.findAll();
    maintenance.findAll();
    reviews.findAll();
    notificationRecords.findAll();
    cancellations.recoverPending();
    notifications.deliverPending();
    started = true;
  }

  @Scheduled(
      fixedDelayString = "${app.recovery.delay-ms:30000}",
      initialDelayString = "${app.recovery.delay-ms:30000}")
  public void retry() {
    if (!started) return;
    try {
      cancellations.recoverPending();
    } catch (StorageException e) {
      org.slf4j.LoggerFactory.getLogger(getClass())
          .warn("Cancellation recovery deferred because storage is unavailable");
    }
    notifications.deliverPending();
  }
}
