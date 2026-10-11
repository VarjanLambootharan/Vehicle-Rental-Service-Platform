package com.se1020.vehiclerental.support;

import com.se1020.vehiclerental.booking.Booking;
import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.booking.BookingService;
import com.se1020.vehiclerental.booking.BookingStatus;
import com.se1020.vehiclerental.booking.CancellationService;
import com.se1020.vehiclerental.booking.dto.BookingRequest;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.customer.Admin;
import com.se1020.vehiclerental.customer.Customer;
import com.se1020.vehiclerental.customer.CustomerRepository;
import com.se1020.vehiclerental.customer.CustomerService;
import com.se1020.vehiclerental.customer.User;
import com.se1020.vehiclerental.maintenance.MaintenanceRepository;
import com.se1020.vehiclerental.maintenance.MaintenanceService;
import com.se1020.vehiclerental.notification.NotificationRepository;
import com.se1020.vehiclerental.notification.NotificationService;
import com.se1020.vehiclerental.payment.PaymentMethod;
import com.se1020.vehiclerental.payment.PaymentRepository;
import com.se1020.vehiclerental.payment.PaymentService;
import com.se1020.vehiclerental.review.ReviewRepository;
import com.se1020.vehiclerental.review.ReviewService;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.AvailabilityService;
import com.se1020.vehiclerental.vehicle.Car;
import com.se1020.vehiclerental.vehicle.Vehicle;
import com.se1020.vehiclerental.vehicle.VehicleRepository;
import com.se1020.vehiclerental.vehicle.VehicleService;
import com.se1020.vehiclerental.vehicle.dto.VehicleRequest;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

public abstract class Fixture {
  @TempDir protected Path directory;
  protected StorageCoordinator lock;
  protected FailingStore store;
  protected CustomerRepository users;
  protected VehicleRepository vehicles;
  protected BookingRepository bookings;
  protected PaymentRepository payments;
  protected MaintenanceRepository maintenance;
  protected ReviewRepository reviews;
  protected NotificationRepository notificationRecords;
  protected Access access;
  protected CustomerService customerService;
  protected VehicleService vehicleService;
  protected BookingService bookingService;
  protected PaymentService paymentService;
  protected MaintenanceService maintenanceService;
  protected ReviewService reviewService;
  protected NotificationService notificationService;
  protected CancellationService cancellationService;
  protected AvailabilityService availability;
  protected MutableClock clock = new MutableClock();
  protected Customer alice, bob;
  protected Admin admin;
  protected Vehicle car;
  protected LocalDate today = LocalDate.of(2030, 1, 10);

  @BeforeEach
  protected void setup() {
    wire();
    alice = new Customer("Alice", "alice@example.com", "test-only-hash", "0771234567");
    bob = new Customer("Bob", "bob@example.com", "test-only-hash", "0771234568");
    admin = new Admin("admin@example.com", "test-only-hash");
    users.save(alice);
    users.save(bob);
    users.save(admin);
    car =
        vehicles.save(
            new Car(
                "CAR-100",
                "Toyota",
                "Aqua",
                new BigDecimal("7500.00"),
                "Compact hybrid",
                5,
                "AUTOMATIC"));
    as(alice);
  }

  protected void wire() {
    lock = new StorageCoordinator();
    store = new FailingStore(directory.toString(), lock);
    users = new CustomerRepository(store);
    vehicles = new VehicleRepository(store);
    bookings = new BookingRepository(store);
    payments = new PaymentRepository(store);
    maintenance = new MaintenanceRepository(store);
    reviews = new ReviewRepository(store);
    notificationRecords = new NotificationRepository(store);
    access = new Access(users);
    availability = new AvailabilityService(vehicles, bookings, maintenance);
    notificationService =
        new NotificationService(notificationRecords, bookings, payments, reviews, lock, access);
    customerService = new CustomerService(users, bookings, lock, access);
    vehicleService = new VehicleService(vehicles, availability, lock, access, clock);
    bookingService =
        new BookingService(
            bookings, vehicles, payments, availability, lock, access, clock, notificationService);
    paymentService =
        new PaymentService(payments, bookings, lock, access, notificationService, true);
    cancellationService =
        new CancellationService(
            bookings, payments, vehicles, lock, access, clock, notificationService);
    maintenanceService =
        new MaintenanceService(maintenance, vehicles, bookings, lock, access, clock);
    reviewService = new ReviewService(reviews, bookings, lock, access, notificationService);
  }

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  protected void as(User user) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                user.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))));
  }

  protected Booking book(int start, int end) {
    var b =
        bookingService.create(
            new BookingRequest(car.getId(), today.plusDays(start), today.plusDays(end)));
    return bookings.require(b.id());
  }

  protected Booking completedBooking() {
    Booking b = book(0, 2);
    paymentService.create(
        new com.se1020.vehiclerental.payment.dto.PaymentRequest(
            b.getId(), PaymentMethod.MOCK_ONLINE));
    as(admin);
    bookingService.status(b.getId(), BookingStatus.ACTIVE);
    bookingService.status(b.getId(), BookingStatus.COMPLETED);
    as(alice);
    return bookings.require(b.getId());
  }

  protected VehicleRequest carRequest(String registration, BigDecimal rate) {
    return new VehicleRequest(
        "CAR", registration, "Toyota", "Aqua", rate, "Compact hybrid", 5, "AUTOMATIC", null);
  }

  public static class MutableClock extends Clock {
    private Instant instant =
        LocalDate.of(2030, 1, 10).atStartOfDay(ZoneId.of("Asia/Colombo")).toInstant();

    @Override
    public ZoneId getZone() {
      return ZoneId.of("Asia/Colombo");
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return Clock.fixed(instant, zone);
    }

    @Override
    public Instant instant() {
      return instant;
    }

    public void advanceDays(long days) {
      instant = instant.plus(Duration.ofDays(days));
    }
  }

  public static class FailingStore extends TextFileStore {
    private String failFile;
    private int remaining;

    public FailingStore(String path, StorageCoordinator lock) {
      super(path, lock);
    }

    public void failOnWrite(String file, int ordinal) {
      failFile = file + ".txt";
      remaining = ordinal;
    }

    public void clearFailure() {
      failFile = null;
    }

    @Override
    protected void replaceAtomically(Path source, Path target) throws IOException {
      if (target.getFileName().toString().equals(failFile) && --remaining == 0) {
        failFile = null;
        throw new IOException("Injected replacement failure");
      }
      super.replaceAtomically(source, target);
    }
  }
}
