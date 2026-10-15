package com.se1020.vehiclerental.vehicle;

import com.se1020.vehiclerental.vehicle.dto.VehicleRequest;
import com.se1020.vehiclerental.vehicle.dto.VehicleResponse;
import com.se1020.vehiclerental.vehicle.dto.VehicleStatusRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/vehicles")
public class VehicleController {
  private final VehicleService service;

  public VehicleController(VehicleService service) {
    this.service = service;
  }

  @GetMapping
  public List<VehicleResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String type,
      @RequestParam(defaultValue = "0") int minimumPassengers,
      @RequestParam(required = false) LocalDate pickupDate,
      @RequestParam(required = false) LocalDate returnDate) {
    return service.list(q, type, minimumPassengers, pickupDate, returnDate);
  }

  @GetMapping("/{id}")
  public VehicleResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public VehicleResponse create(@Valid @RequestBody VehicleRequest request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public VehicleResponse update(@PathVariable UUID id, @Valid @RequestBody VehicleRequest request) {
    return service.update(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public VehicleResponse status(
      @PathVariable UUID id, @Valid @RequestBody VehicleStatusRequest request) {
    return service.status(id, request.status());
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.status(id, VehicleStatus.INACTIVE);
  }
}
