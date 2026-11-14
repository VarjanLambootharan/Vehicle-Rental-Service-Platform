package com.se1020.vehiclerental.payment;

import com.se1020.vehiclerental.payment.dto.PaymentRequest;
import com.se1020.vehiclerental.payment.dto.PaymentResponse;
import com.se1020.vehiclerental.payment.dto.PaymentStatusRequest;
import com.se1020.vehiclerental.deletion.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {
  private final PaymentService service;
  private final HardDeletionService deletions;

  public PaymentController(PaymentService service, HardDeletionService deletions) {
    this.service = service;
    this.deletions = deletions;
  }

  @PostMapping
  @PreAuthorize("hasRole('CUSTOMER')")
  @ResponseStatus(HttpStatus.CREATED)
  public PaymentResponse create(@Valid @RequestBody PaymentRequest request) {
    return service.create(request);
  }

  @GetMapping("/me")
  @PreAuthorize("hasRole('CUSTOMER')")
  public List<PaymentResponse> mine() {
    return service.mine();
  }

  @GetMapping("/{id}")
  public PaymentResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<PaymentResponse> all() {
    return service.all();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public PaymentResponse status(
      @PathVariable UUID id, @Valid @RequestBody PaymentStatusRequest request) {
    return service.status(id, request.status());
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    return DeletionController.response(deletions.payment(id));
  }
}
