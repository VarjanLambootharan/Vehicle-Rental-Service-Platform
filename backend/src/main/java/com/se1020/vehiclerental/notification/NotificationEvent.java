package com.se1020.vehiclerental.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationEvent(
    UUID eventId,
    UUID recipientUserId,
    NotificationType notificationType,
    String title,
    String message,
    UUID relatedEntityId,
    Instant createdAt) {
  public static NotificationEvent create(
      UUID recipient, NotificationType type, String title, String message, UUID related) {
    return new NotificationEvent(
        UUID.randomUUID(), recipient, type, title, message, related, Instant.now());
  }
}
