package com.se1020.vehiclerental.booking;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.common.model.EventEntity;
import com.se1020.vehiclerental.notification.NotificationType;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public final class Booking extends EventEntity {
  private UUID customerId, vehicleId;
  private RentalPeriod rentalPeriod;
  private BigDecimal dailyRateSnapshot, totalAmount;
  private BookingStatus status = BookingStatus.CONFIRMED;
  private Instant cancelledAt;
  private CancellationWorkflow cancellationWorkflow;

  private Booking() {}

  public Booking(UUID customerId, UUID vehicleId, RentalPeriod period, BigDecimal rate) {
    this.customerId = customerId;
    this.vehicleId = vehicleId;
    rentalPeriod = period;
    dailyRateSnapshot = rate;
    totalAmount = rate.multiply(BigDecimal.valueOf(period.days()));
    recordEvent(
        customerId,
        NotificationType.BOOKING_CONFIRMED,
        "Booking Confirmed",
        "Your vehicle booking is confirmed.");
  }

  public boolean blocksDates() {
    return status == BookingStatus.CONFIRMED
        || status == BookingStatus.ACTIVE
        || status == BookingStatus.CANCELLATION_PENDING;
  }

  public void modifyDates(RentalPeriod period) {
    require(
        status == BookingStatus.CONFIRMED,
        "BOOKING_STATE",
        "Only confirmed bookings can change dates");
    rentalPeriod = period;
    totalAmount = dailyRateSnapshot.multiply(BigDecimal.valueOf(period.days()));
    touch();
  }

  public void start() {
    require(
        status == BookingStatus.CONFIRMED, "BOOKING_STATE", "Only confirmed bookings can start");
    status = BookingStatus.ACTIVE;
    touch();
    recordEvent(
        customerId, NotificationType.RENTAL_STARTED, "Rental Started", "Your rental has started.");
  }

  public void complete() {
    require(status == BookingStatus.ACTIVE, "BOOKING_STATE", "Only active rentals can complete");
    status = BookingStatus.COMPLETED;
    touch();
    recordEvent(
        customerId,
        NotificationType.RENTAL_COMPLETED,
        "Rental Completed",
        "Your rental is complete. You can now submit a review.");
  }

  public void requestCancellation(CancellationWorkflow workflow) {
    require(
        status == BookingStatus.CONFIRMED,
        "BOOKING_STATE",
        "Only confirmed bookings can be cancelled");
    cancellationWorkflow = workflow;
    status = BookingStatus.CANCELLATION_PENDING;
    touch();
  }

  public void finishCancellation(String title, String message) {
    require(
        status == BookingStatus.CANCELLATION_PENDING,
        "BOOKING_STATE",
        "Cancellation intent required");
    cancellationWorkflow.complete();
    status = BookingStatus.CANCELLED;
    cancelledAt = Instant.now();
    touch();
    recordEvent(customerId, NotificationType.BOOKING_CANCELLED, title, message);
  }

  public UUID getCustomerId() {
    return customerId;
  }

  public UUID getVehicleId() {
    return vehicleId;
  }

  public RentalPeriod getRentalPeriod() {
    return rentalPeriod;
  }

  public BigDecimal getDailyRateSnapshot() {
    return dailyRateSnapshot;
  }

  public BigDecimal getTotalAmount() {
    return totalAmount;
  }

  public BookingStatus getStatus() {
    return status;
  }

  public Instant getCancelledAt() {
    return cancelledAt;
  }

  public CancellationWorkflow getCancellationWorkflow() {
    return cancellationWorkflow;
  }
}
