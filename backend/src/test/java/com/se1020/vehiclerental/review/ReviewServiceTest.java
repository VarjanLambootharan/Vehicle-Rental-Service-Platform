package com.se1020.vehiclerental.review;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.review.dto.ReviewRequest;
import com.se1020.vehiclerental.review.dto.ReviewUpdateRequest;
import com.se1020.vehiclerental.support.Fixture;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;

public class ReviewServiceTest extends Fixture {

  @Test
  void completedRentalCanBeReviewedAndEdited() {
    var b = completedBooking();
    var r = reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great"));
    assertThat(reviewService.update(r.id(), new ReviewUpdateRequest(4, "Good")).rating())
        .isEqualTo(4);
  }

  @Test
  void reviewBeforeCompletionRejected() {
    var b = book(1, 3);
    assertThatThrownBy(
            () -> reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great")))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void hiddenReviewStillPreventsDuplicate() {
    var b = completedBooking();
    var request = new ReviewRequest(b.getId(), car.getId(), 5, "Great");
    var r = reviewService.create(request);
    reviewService.delete(r.id());
    assertThat(reviewService.list(null)).isEmpty();
    assertThatThrownBy(() -> reviewService.create(request)).isInstanceOf(BusinessException.class);
    assertThat(reviews.findAll()).hasSize(1);
    as(admin);
    assertThat(reviewService.list(null)).hasSize(1);
  }

  @Test
  void invalidRatingRejected() {
    var b = completedBooking();
    assertThatThrownBy(
            () -> reviewService.create(new ReviewRequest(b.getId(), car.getId(), 6, "Great")))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void anotherCustomerCannotModifyOrDelete() {
    var b = completedBooking();
    var r = reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great"));
    as(bob);
    assertThatThrownBy(() -> reviewService.update(r.id(), new ReviewUpdateRequest(1, "Bad")))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> reviewService.delete(r.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  }

  @Test
  void mismatchedVehicleRejected() {
    var b = completedBooking();
    assertThatThrownBy(
            () -> reviewService.create(new ReviewRequest(b.getId(), UUID.randomUUID(), 5, "Great")))
        .isInstanceOf(BusinessException.class);
  }
}
