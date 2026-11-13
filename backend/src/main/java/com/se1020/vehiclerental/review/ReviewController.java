package com.se1020.vehiclerental.review;

import com.se1020.vehiclerental.review.dto.ReviewRequest;
import com.se1020.vehiclerental.review.dto.ReviewResponse;
import com.se1020.vehiclerental.review.dto.ReviewUpdateRequest;
import com.se1020.vehiclerental.deletion.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {
  private final ReviewService service;
  private final HardDeletionService deletions;

  public ReviewController(ReviewService service, HardDeletionService deletions) {
    this.service = service;
    this.deletions = deletions;
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

  @PatchMapping("/{id}/hide")
  @PreAuthorize("hasRole('ADMIN')")
  public ReviewResponse hide(@PathVariable UUID id) {
    return service.hide(id);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    return DeletionController.response(deletions.review(id));
  }
}
