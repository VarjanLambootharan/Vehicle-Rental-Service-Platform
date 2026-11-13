package com.se1020.vehiclerental.review;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.common.storage.TextFileStore;
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
  void administratorCanHideReviewWithoutDeletingItOrAllowingAnotherReview() {
    var b = completedBooking();
    var r = reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great"));

    as(admin);
    var hidden = reviewService.hide(r.id());
    assertThat(hidden.deletedAt()).isNotNull();
    assertThat(
            new ReviewRepository(new TextFileStore(directory.toString(), new StorageCoordinator()))
                .require(r.id())
                .getDeletedAt())
        .isNotNull();
    assertThat(reviewService.list(null)).singleElement().extracting(x -> x.deletedAt()).isNotNull();

    as(alice);
    assertThat(reviewService.list(null)).isEmpty();
    assertThat(reviewService.mine()).singleElement().extracting(x -> x.deletedAt()).isNotNull();
    assertThatThrownBy(() -> reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Again")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("including hidden reviews");
  }

  @Test
  void customerCannotHideReview() {
    var b = completedBooking();
    var r = reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great"));
    assertThatThrownBy(() -> reviewService.hide(r.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  }

  @Test
  void reviewBeforeCompletionRejected() {
    var b = book(1, 3);
    assertThatThrownBy(
            () -> reviewService.create(new ReviewRequest(b.getId(), car.getId(), 5, "Great")))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void deletedReviewAllowsANewReviewForTheCompletedBooking() {
    var b = completedBooking();
    var request = new ReviewRequest(b.getId(), car.getId(), 5, "Great");
    var r = reviewService.create(request);
    reviewService.delete(r.id());
    assertThat(reviewService.list(null)).isEmpty();
    assertThat(reviewService.create(request)).isNotNull();
    assertThat(reviews.findAll()).hasSize(1);
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
