package com.se1020.vehiclerental.common.model;

import com.se1020.vehiclerental.notification.NotificationEvent;
import com.se1020.vehiclerental.notification.NotificationType;
import java.util.*;

public abstract class EventEntity extends Entity {
  private List<NotificationEvent> events = new ArrayList<>();

  public List<NotificationEvent> getEvents() {
    return List.copyOf(events);
  }

  protected void recordEvent(UUID recipient, NotificationType type, String title, String message) {
    events.add(NotificationEvent.create(recipient, type, title, message, getId()));
  }
}
