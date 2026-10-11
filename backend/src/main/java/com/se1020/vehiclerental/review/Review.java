package com.se1020.vehiclerental.review;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.common.model.EventEntity;
import com.se1020.vehiclerental.notification.NotificationType;
import java.time.Instant;
import java.util.UUID;

public final class Review extends EventEntity {
  private UUID customerId, vehicleId, bookingId;
  private int rating;
  private String comment;
  private Instant deletedAt;

  private Review() {}

  public Review(UUID customerId, UUID vehicleId, UUID bookingId, int rating, String comment) {
    this.customerId = customerId;
    this.vehicleId = vehicleId;
    this.bookingId = bookingId;
    edit(rating, comment);
    recordEvent(
        customerId,
        NotificationType.REVIEW_SUBMITTED,
        "Review Submitted",
        "Thank you for reviewing your rental.");
  }

  public void edit(int rating, String comment) {
    require(deletedAt == null, "REVIEW_DELETED", "Deleted reviews cannot be edited");
    if (rating < 1 || rating > 5 || comment == null || comment.isBlank() || comment.length() > 2000)
      throw new IllegalArgumentException("Invalid rating or comment");
    this.rating = rating;
    this.comment = comment.trim();
    touch();
  }

  public void hide() {
    if (deletedAt == null) {
      deletedAt = Instant.now();
      touch();
    }
  }

  public UUID getCustomerId() {
    return customerId;
  }

  public UUID getVehicleId() {
    return vehicleId;
  }

  public UUID getBookingId() {
    return bookingId;
  }

  public int getRating() {
    return rating;
  }

  public String getComment() {
    return comment;
  }

  public Instant getDeletedAt() {
    return deletedAt;
  }
}
