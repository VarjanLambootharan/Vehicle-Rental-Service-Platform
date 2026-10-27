package com.se1020.vehiclerental.maintenance;

import com.se1020.vehiclerental.maintenance.dto.MaintenanceRequest;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceResponse;
import com.se1020.vehiclerental.maintenance.dto.MaintenanceUpdateRequest;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/maintenance")
public class MaintenanceController {
  private final MaintenanceService service;

  public MaintenanceController(MaintenanceService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<MaintenanceResponse> list(
      @RequestParam(required = false) String q, @RequestParam(required = false) UUID vehicleId) {
    return service.list(q, vehicleId);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public MaintenanceResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public MaintenanceResponse create(@Valid @RequestBody MaintenanceRequest request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public MaintenanceResponse update(
      @PathVariable UUID id, @Valid @RequestBody MaintenanceUpdateRequest request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.cancel(id);
  }
}
