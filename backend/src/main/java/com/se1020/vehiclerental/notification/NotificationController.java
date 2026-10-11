package com.se1020.vehiclerental.notification;

import com.se1020.vehiclerental.notification.dto.NotificationResponse;
import com.se1020.vehiclerental.notification.dto.UnreadCountResponse;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
  private final NotificationService service;

  public NotificationController(NotificationService service) {
    this.service = service;
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
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void dismiss(@PathVariable UUID id) {
    service.dismiss(id);
  }

  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void dismissAll() {
    service.dismissAll();
  }
}
