package com.se1020.vehiclerental.booking;

import com.se1020.vehiclerental.booking.dto.BookingDatesRequest;
import com.se1020.vehiclerental.booking.dto.BookingRequest;
import com.se1020.vehiclerental.booking.dto.BookingResponse;
import com.se1020.vehiclerental.booking.dto.BookingStatusRequest;
import com.se1020.vehiclerental.deletion.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {
  private final BookingService service;
  private final CancellationService cancellations;
  private final HardDeletionService deletions;

  public BookingController(BookingService service, CancellationService cancellations, HardDeletionService deletions) {
    this.service = service;
    this.cancellations = cancellations;
    this.deletions = deletions;
  }

  @PostMapping
  @PreAuthorize("hasRole('CUSTOMER')")
  @ResponseStatus(HttpStatus.CREATED)
  public BookingResponse create(@Valid @RequestBody BookingRequest request) {
    return service.create(request);
  }

  @GetMapping("/me")
  @PreAuthorize("hasRole('CUSTOMER')")
  public List<BookingResponse> mine() {
    return service.mine();
  }

  @GetMapping("/{id}")
  public BookingResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('CUSTOMER')")
  public BookingResponse update(
      @PathVariable UUID id, @Valid @RequestBody BookingDatesRequest request) {
    return service.update(id, request);
  }

  @PatchMapping("/{id}/cancel")
  public ResponseEntity<BookingResponse> cancel(@PathVariable UUID id) {
    BookingResponse result = cancellations.cancel(id);
    return result.status() == BookingStatus.CANCELLATION_PENDING
        ? ResponseEntity.status(HttpStatus.ACCEPTED).body(result)
        : ResponseEntity.ok(result);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    return DeletionController.response(deletions.booking(id));
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<BookingResponse> all() {
    return service.all();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public BookingResponse status(
      @PathVariable UUID id, @Valid @RequestBody BookingStatusRequest request) {
    return service.status(id, request.status());
  }
}
