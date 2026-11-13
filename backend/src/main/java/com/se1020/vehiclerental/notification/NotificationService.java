package com.se1020.vehiclerental.notification;

import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.common.storage.StorageException;
import com.se1020.vehiclerental.deletion.HardDeletionService;
import com.se1020.vehiclerental.notification.dto.NotificationResponse;
import com.se1020.vehiclerental.payment.PaymentRepository;
import com.se1020.vehiclerental.review.ReviewRepository;
import com.se1020.vehiclerental.security.Access;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
  private final NotificationRepository notifications;
  private final BookingRepository bookings;
  private final PaymentRepository payments;
  private final ReviewRepository reviews;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final HardDeletionService deletions;

  public NotificationService(
      NotificationRepository notifications,
      BookingRepository bookings,
      PaymentRepository payments,
      ReviewRepository reviews,
      StorageCoordinator coordinator,
      Access access,
      HardDeletionService deletions) {
    this.notifications = notifications;
    this.bookings = bookings;
    this.payments = payments;
    this.reviews = reviews;
    this.coordinator = coordinator;
    this.access = access;
    this.deletions = deletions;
  }

  private static final org.slf4j.Logger LOG =
      org.slf4j.LoggerFactory.getLogger(NotificationService.class);

  /** Best effort after business state commits; events remain in their source files. */
  public void deliverPending() {
    try {
      coordinator.locked(
          () -> {
            var events = new ArrayList<NotificationEvent>();
            bookings.findAll().forEach(b -> events.addAll(b.getEvents()));
            payments.findAll().forEach(p -> events.addAll(p.getEvents()));
            reviews.findAll().forEach(r -> events.addAll(r.getEvents()));
            Set<UUID> delivered = new HashSet<>();
            notifications.findAll().forEach(n -> delivered.add(n.getEventId()));
            var pending = new ArrayList<Notification>();
            for (var event : events)
              if (delivered.add(event.eventId())) pending.add(new Notification(event));
            notifications.saveAll(pending);
          });
    } catch (StorageException e) {
      LOG.warn("Notification delivery deferred; persisted events will be retried");
    }
  }

  public List<NotificationResponse> list() {
    UUID owner = access.current().getId();
    return notifications.findAll().stream()
        .filter(n -> n.getRecipientUserId().equals(owner) && n.getDismissedAt() == null)
        .sorted(Comparator.comparing(Notification::getCreatedAt).reversed())
        .map(NotificationResponse::from)
        .toList();
  }

  public long unreadCount() {
    return list().stream().filter(n -> !n.read()).count();
  }

  public NotificationResponse markRead(UUID id) {
    return coordinator.locked(
        () -> {
          var n = notifications.require(id);
          access.owner(n.getRecipientUserId());
          n.markRead();
          return NotificationResponse.from(notifications.save(n));
        });
  }

  public void dismiss(UUID id) {
    deletions.notification(id);
  }

  public void markAllRead() {
    all(false);
  }

  public void dismissAll() {
    deletions.notifications();
  }

  private void all(boolean dismiss) {
    coordinator.locked(
        () -> {
          UUID owner = access.current().getId();
          var changed = new ArrayList<Notification>();
          for (var n : notifications.findAll())
            if (n.getRecipientUserId().equals(owner)
                && n.getDismissedAt() == null
                && (dismiss || !n.isRead())) {
              if (dismiss) n.dismiss();
              else n.markRead();
              changed.add(n);
            }
          notifications.saveAll(changed);
        });
  }
}
