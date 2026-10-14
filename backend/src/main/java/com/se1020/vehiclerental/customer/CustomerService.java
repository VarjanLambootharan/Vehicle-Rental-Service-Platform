package com.se1020.vehiclerental.customer;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.booking.BookingRepository;
import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.customer.dto.CustomerResponse;
import com.se1020.vehiclerental.customer.dto.ProfileRequest;
import com.se1020.vehiclerental.security.Access;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CustomerService {
  private final CustomerRepository users;
  private final BookingRepository bookings;
  private final StorageCoordinator coordinator;
  private final Access access;

  public CustomerService(
      CustomerRepository users,
      BookingRepository bookings,
      StorageCoordinator coordinator,
      Access access) {
    this.users = users;
    this.bookings = bookings;
    this.coordinator = coordinator;
    this.access = access;
  }

  public CustomerResponse me() {
    return CustomerResponse.from(access.customer());
  }

  public List<CustomerResponse> list(String query) {
    access.admin();
    String term = query == null ? "" : query.toLowerCase(Locale.ROOT);
    return users.findAll().stream()
        .filter(u -> u instanceof Customer)
        .filter(u -> (u.getFullName() + " " + u.getEmail()).toLowerCase(Locale.ROOT).contains(term))
        .map(CustomerResponse::from)
        .toList();
  }

  public CustomerResponse get(UUID id) {
    access.admin();
    return CustomerResponse.from(customer(id));
  }

  private Customer customer(UUID id) {
    var u = users.require(id);
    if (!(u instanceof Customer c)) throw new ResourceNotFoundException("Customer");
    return c;
  }

  public CustomerResponse update(ProfileRequest request) {
    return coordinator.locked(
        () -> {
          Customer c = customer(access.customer().getId());
          require(
              users
                  .findByEmail(request.email())
                  .filter(u -> !u.getId().equals(c.getId()))
                  .isEmpty(),
              "DUPLICATE_EMAIL",
              "Email is already registered");
          c.updateProfile(request.fullName(), request.email(), request.phone());
          return CustomerResponse.from(users.save(c));
        });
  }

  public void deactivateMe() {
    coordinator.locked(() -> changeActive(access.customer().getId(), false));
  }

  public CustomerResponse active(UUID id, boolean active) {
    return coordinator.locked(
        () -> {
          access.admin();
          return changeActive(id, active);
        });
  }

  private CustomerResponse changeActive(UUID id, boolean active) {
    Customer c = customer(id);
    if (!active)
      require(
          bookings.findAll().stream()
              .noneMatch(b -> b.getCustomerId().equals(id) && b.blocksDates()),
          "CUSTOMER_HAS_BOOKINGS",
          "Resolve protected bookings before deactivating this customer");
    if (active) c.activate();
    else c.deactivate();
    return CustomerResponse.from(users.save(c));
  }
}
