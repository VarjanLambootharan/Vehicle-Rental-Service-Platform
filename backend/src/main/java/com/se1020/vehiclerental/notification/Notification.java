package com.se1020.vehiclerental.notification;

import com.se1020.vehiclerental.common.model.Entity;
import java.time.Instant;
import java.util.UUID;

public final class Notification extends Entity {
  private UUID eventId, recipientUserId, relatedEntityId;
  private NotificationType notificationType;
  private String title, message;
  private boolean read;
  private Instant readAt, dismissedAt;

  private Notification() {}

  public Notification(NotificationEvent event) {
    eventId = event.eventId();
    recipientUserId = event.recipientUserId();
    relatedEntityId = event.relatedEntityId();
    notificationType = event.notificationType();
    title = event.title();
    message = event.message();
  }

  public void markRead() {
    if (!read) {
      read = true;
      readAt = Instant.now();
      touch();
    }
  }

  public void dismiss() {
    if (dismissedAt == null) {
      dismissedAt = Instant.now();
      touch();
    }
  }

  public UUID getEventId() {
    return eventId;
  }

  public UUID getRecipientUserId() {
    return recipientUserId;
  }

  public UUID getRelatedEntityId() {
    return relatedEntityId;
  }

  public NotificationType getNotificationType() {
    return notificationType;
  }

  public String getTitle() {
    return title;
  }

  public String getMessage() {
    return message;
  }

  public boolean isRead() {
    return read;
  }

  public Instant getReadAt() {
    return readAt;
  }

  public Instant getDismissedAt() {
    return dismissedAt;
  }
}
