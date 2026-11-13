package com.se1020.vehiclerental.notification;

public enum NotificationType {
  BOOKING_CONFIRMED,
  BOOKING_CANCELLED,
  PAYMENT_RECORDED,
  PAYMENT_PAID,
  PAYMENT_FAILED,
  SIMULATED_REFUND_COMPLETED,
  RENTAL_STARTED,
  RENTAL_COMPLETED,
  REVIEW_SUBMITTED,
  /** Persisted directly with a deletion receipt; no deleted source record is needed for replay. */
  BOOKING_REMOVED_BY_ADMIN,
  BOOKING_HISTORY_REMOVED,
  REVIEW_REMOVED_BY_ADMIN,
  PAYMENT_RECORD_REMOVED
}
