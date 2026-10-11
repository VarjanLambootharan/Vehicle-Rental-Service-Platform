package com.se1020.vehiclerental.review;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.booking.BookingStatus;
import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.notification.NotificationService;
import com.se1020.vehiclerental.review.dto.ReviewRequest;
import com.se1020.vehiclerental.review.dto.ReviewResponse;
import com.se1020.vehiclerental.review.dto.ReviewUpdateRequest;
import com.se1020.vehiclerental.security.Access;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ReviewService {
  private final ReviewRepository reviews;
  private final BookingRepository bookings;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final NotificationService notifications;

  public ReviewService(
      ReviewRepository reviews,
      BookingRepository bookings,
      StorageCoordinator coordinator,
      Access access,
      NotificationService notifications) {
    this.reviews = reviews;
    this.bookings = bookings;
    this.coordinator = coordinator;
    this.access = access;
    this.notifications = notifications;
  }

  public List<ReviewResponse> list(UUID vehicleId) {
    boolean admin = access.isAdmin();
    return reviews.findAll().stream()
        .filter(r -> admin || r.getDeletedAt() == null)
        .filter(r -> vehicleId == null || r.getVehicleId().equals(vehicleId))
        .map(ReviewResponse::from)
        .toList();
  }

  public ReviewResponse get(UUID id) {
    var r = reviews.require(id);
    if (r.getDeletedAt() != null && !access.isAdmin())
      throw new ResourceNotFoundException("Review");
    return ReviewResponse.from(r);
  }

  public List<ReviewResponse> mine() {
    UUID id = access.customer().getId();
    return reviews.findAll().stream()
        .filter(r -> r.getCustomerId().equals(id))
        .map(ReviewResponse::from)
        .toList();
  }

  public ReviewResponse create(ReviewRequest request) {
    var result =
        coordinator.locked(
            () -> {
              UUID owner = access.customer().getId();
              var b = bookings.require(request.bookingId());
              access.owner(b.getCustomerId());
              require(
                  b.getStatus() == BookingStatus.COMPLETED,
                  "BOOKING_STATE",
                  "Complete a rental before reviewing it");
              require(
                  b.getVehicleId().equals(request.vehicleId()),
                  "REVIEW_VEHICLE",
                  "Reviewed vehicle must match the booking");
              require(
                  reviews.findAll().stream().noneMatch(r -> r.getBookingId().equals(b.getId())),
                  "DUPLICATE_REVIEW",
                  "A review already exists for this booking, including hidden reviews");
              return ReviewResponse.from(
                  reviews.save(
                      new Review(
                          owner,
                          request.vehicleId(),
                          b.getId(),
                          request.rating(),
                          request.comment())));
            });
    notifications.deliverPending();
    return result;
  }

  public ReviewResponse update(UUID id, ReviewUpdateRequest request) {
    return coordinator.locked(
        () -> {
          var r = reviews.require(id);
          access.customer();
          access.owner(r.getCustomerId());
          r.edit(request.rating(), request.comment());
          return ReviewResponse.from(reviews.save(r));
        });
  }

  public void delete(UUID id) {
    coordinator.locked(
        () -> {
          var r = reviews.require(id);
          access.ownerOrAdmin(r.getCustomerId());
          r.hide();
          reviews.save(r);
        });
  }
}
