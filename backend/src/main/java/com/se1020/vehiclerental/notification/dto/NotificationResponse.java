package com.se1020.vehiclerental.notification.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    UUID eventId,
    UUID recipientUserId,
    com.se1020.vehiclerental.notification.NotificationType notificationType,
    String title,
    String message,
    UUID relatedEntityId,
    boolean read,
    Instant createdAt,
    Instant readAt,
    Instant dismissedAt) {
  public static NotificationResponse from(com.se1020.vehiclerental.notification.Notification n) {
    return new NotificationResponse(
        n.getId(),
        n.getEventId(),
        n.getRecipientUserId(),
        n.getNotificationType(),
        n.getTitle(),
        n.getMessage(),
        n.getRelatedEntityId(),
        n.isRead(),
        n.getCreatedAt(),
        n.getReadAt(),
        n.getDismissedAt());
  }
}
