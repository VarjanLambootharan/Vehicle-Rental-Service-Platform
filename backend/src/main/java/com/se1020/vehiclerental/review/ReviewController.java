package com.se1020.vehiclerental.review;

import com.se1020.vehiclerental.review.dto.ReviewRequest;
import com.se1020.vehiclerental.review.dto.ReviewResponse;
import com.se1020.vehiclerental.review.dto.ReviewUpdateRequest;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {
  private final ReviewService service;

  public ReviewController(ReviewService service) {
    this.service = service;
  }

  @GetMapping
  public List<ReviewResponse> list(@RequestParam(required = false) UUID vehicleId) {
    return service.list(vehicleId);
  }

  @GetMapping("/me")
  @PreAuthorize("hasRole('CUSTOMER')")
  public List<ReviewResponse> mine() {
    return service.mine();
  }

  @GetMapping("/{id}")
  public ReviewResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasRole('CUSTOMER')")
  @ResponseStatus(HttpStatus.CREATED)
  public ReviewResponse create(@Valid @RequestBody ReviewRequest request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('CUSTOMER')")
  public ReviewResponse update(
      @PathVariable UUID id, @Valid @RequestBody ReviewUpdateRequest request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }
}
