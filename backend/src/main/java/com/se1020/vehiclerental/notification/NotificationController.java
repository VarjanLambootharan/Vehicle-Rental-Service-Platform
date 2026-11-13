package com.se1020.vehiclerental.notification;

import com.se1020.vehiclerental.notification.dto.NotificationResponse;
import com.se1020.vehiclerental.notification.dto.UnreadCountResponse;
import com.se1020.vehiclerental.deletion.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
  private final NotificationService service;
  private final HardDeletionService deletions;

  public NotificationController(NotificationService service, HardDeletionService deletions) {
    this.service = service;
    this.deletions = deletions;
  }

  @GetMapping
  public List<NotificationResponse> list() {
    return service.list();
  }

  @GetMapping("/unread-count")
  public UnreadCountResponse count() {
    return new UnreadCountResponse(service.unreadCount());
  }

  @PatchMapping("/{id}/read")
  public NotificationResponse read(@PathVariable UUID id) {
    return service.markRead(id);
  }

  @PatchMapping("/read-all")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void readAll() {
    service.markAllRead();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    return DeletionController.response(deletions.notification(id));
  }

  @DeleteMapping
  public ResponseEntity<Void> deleteAll() {
    return DeletionController.response(deletions.notifications());
  }
}
