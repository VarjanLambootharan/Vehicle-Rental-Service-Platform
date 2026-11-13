package com.se1020.vehiclerental.vehicleimage;

import com.se1020.vehiclerental.vehicleimage.dto.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/vehicles/{vehicleId}/images")
public class VehicleImageController {
  private final VehicleImageService service;

  public VehicleImageController(VehicleImageService service) {
    this.service = service;
  }

  @GetMapping
  public List<VehicleImageResponse> list(@PathVariable UUID vehicleId) {
    return service.list(vehicleId);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public VehicleImageResponse create(
      @PathVariable UUID vehicleId, @Valid @RequestBody VehicleImageRequest request) {
    return service.create(vehicleId, request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public VehicleImageResponse update(
      @PathVariable UUID vehicleId,
      @PathVariable UUID id,
      @Valid @RequestBody VehicleImageRequest request) {
    return service.update(vehicleId, id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID vehicleId, @PathVariable UUID id) {
    service.delete(vehicleId, id);
  }
}
