package com.se1020.vehiclerental.booking;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.dto.BookingDatesRequest;
import com.se1020.vehiclerental.booking.dto.BookingRequest;
import com.se1020.vehiclerental.booking.dto.BookingResponse;
import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.notification.NotificationService;
import com.se1020.vehiclerental.payment.PaymentRepository;
import com.se1020.vehiclerental.payment.PaymentStatus;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.AvailabilityService;
import com.se1020.vehiclerental.vehicle.VehicleRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class BookingService {
  private final BookingRepository bookings;
  private final VehicleRepository vehicles;
  private final PaymentRepository payments;
  private final AvailabilityService availability;
  private final StorageCoordinator coordinator;
  private final Access access;
  private final Clock clock;
  private final NotificationService notifications;

  public BookingService(
      BookingRepository bookings,
      VehicleRepository vehicles,
      PaymentRepository payments,
      AvailabilityService availability,
      StorageCoordinator coordinator,
      Access access,
      Clock clock,
      NotificationService notifications) {
    this.bookings = bookings;
    this.vehicles = vehicles;
    this.payments = payments;
    this.availability = availability;
    this.coordinator = coordinator;
    this.access = access;
    this.clock = clock;
    this.notifications = notifications;
  }

  public BookingResponse create(BookingRequest request) {
    BookingResponse result =
        coordinator.locked(
            () -> {
              UUID customer = access.customer().getId();
              var period = new RentalPeriod(request.pickupDate(), request.returnDate());
              period.requireNotPast(clock);
              availability.requireAvailable(request.vehicleId(), period, null);
              return BookingResponse.from(
                  bookings.save(
                      new Booking(
                          customer,
                          request.vehicleId(),
                          period,
                          vehicles.require(request.vehicleId()).getDailyRate())));
            });
    notifications.deliverPending();
    return result;
  }

  public List<BookingResponse> mine() {
    UUID id = access.customer().getId();
    return bookings.findAll().stream()
        .filter(b -> b.getCustomerId().equals(id))
        .map(BookingResponse::from)
        .toList();
  }

  public List<BookingResponse> all() {
    access.admin();
    return bookings.findAll().stream().map(BookingResponse::from).toList();
  }

  public BookingResponse get(UUID id) {
    var b = bookings.require(id);
    access.ownerOrAdmin(b.getCustomerId());
    return BookingResponse.from(b);
  }

  public BookingResponse update(UUID id, BookingDatesRequest request) {
    return coordinator.locked(
        () -> {
          var b = bookings.require(id);
          access.customer();
          access.owner(b.getCustomerId());
          require(
              b.getStatus() == BookingStatus.CONFIRMED
                  && b.getRentalPeriod().pickupDate().isAfter(LocalDate.now(clock)),
              "BOOKING_STATE",
              "Only future confirmed bookings can be modified");
          require(
              payments.findAll().stream()
                  .noneMatch(p -> p.getBookingId().equals(id) && p.current()),
              "BOOKING_HAS_PAYMENT",
              "Pending or paid bookings cannot be modified");
          var period = new RentalPeriod(request.pickupDate(), request.returnDate());
          period.requireNotPast(clock);
          availability.requireAvailable(b.getVehicleId(), period, id);
          b.modifyDates(period);
          return BookingResponse.from(bookings.save(b));
        });
  }

  public BookingResponse status(UUID id, BookingStatus status) {
    var result =
        coordinator.locked(
            () -> {
              access.admin();
              var b = bookings.require(id);
              if (status == BookingStatus.ACTIVE) {
                require(
                    b.getRentalPeriod().contains(LocalDate.now(clock)),
                    "RENTAL_DATE",
                    "Start a rental only within its booked interval");
                require(
                    payments.findAll().stream()
                        .anyMatch(
                            p ->
                                p.getBookingId().equals(id) && p.getStatus() == PaymentStatus.PAID),
                    "PAYMENT_REQUIRED",
                    "A paid payment is required to start a rental");
                availability.requireAvailable(b.getVehicleId(), b.getRentalPeriod(), id);
                b.start();
              } else if (status == BookingStatus.COMPLETED) b.complete();
              else
                throw new BusinessException(
                    "BOOKING_STATE", "Use the cancellation endpoint or a valid rental transition");
              return BookingResponse.from(bookings.save(b));
            });
    notifications.deliverPending();
    return result;
  }
}
