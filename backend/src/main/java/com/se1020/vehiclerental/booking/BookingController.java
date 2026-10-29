package com.se1020.vehiclerental.booking;

import com.se1020.vehiclerental.booking.dto.BookingDatesRequest;
import com.se1020.vehiclerental.booking.dto.BookingRequest;
import com.se1020.vehiclerental.booking.dto.BookingResponse;
import com.se1020.vehiclerental.booking.dto.BookingStatusRequest;
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

  public BookingController(BookingService service, CancellationService cancellations) {
    this.service = service;
    this.cancellations = cancellations;
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

  @DeleteMapping("/{id}")
  public ResponseEntity<BookingResponse> cancel(@PathVariable UUID id) {
    var result = cancellations.cancel(id);
    return ResponseEntity.status(
            result.status() == BookingStatus.CANCELLATION_PENDING
                ? HttpStatus.ACCEPTED
                : HttpStatus.OK)
        .body(result);
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
