package com.se1020.vehiclerental.customer;

import com.se1020.vehiclerental.customer.dto.ActiveRequest;
import com.se1020.vehiclerental.customer.dto.CustomerResponse;
import com.se1020.vehiclerental.customer.dto.ProfileRequest;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
  private final CustomerService service;

  public CustomerController(CustomerService service) {
    this.service = service;
  }

  @GetMapping("/me")
  @PreAuthorize("hasRole('CUSTOMER')")
  public CustomerResponse me() {
    return service.me();
  }

  @PutMapping("/me")
  @PreAuthorize("hasRole('CUSTOMER')")
  public CustomerResponse update(@Valid @RequestBody ProfileRequest request) {
    return service.update(request);
  }

  @DeleteMapping("/me")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('CUSTOMER')")
  public void deactivate() {
    service.deactivateMe();
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<CustomerResponse> list(@RequestParam(required = false) String q) {
    return service.list(q);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public CustomerResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PatchMapping("/{id}/active")
  @PreAuthorize("hasRole('ADMIN')")
  public CustomerResponse active(@PathVariable UUID id, @Valid @RequestBody ActiveRequest request) {
    return service.active(id, request.active());
  }
}
