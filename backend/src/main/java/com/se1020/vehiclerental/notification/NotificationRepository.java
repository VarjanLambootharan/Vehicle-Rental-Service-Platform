package com.se1020.vehiclerental.notification;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository extends TextRepository<Notification> {
  public NotificationRepository(TextFileStore store) {
    super(store, "notifications", Notification.class);
  }
}
