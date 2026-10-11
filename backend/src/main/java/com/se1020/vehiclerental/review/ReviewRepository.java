package com.se1020.vehiclerental.review;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class ReviewRepository extends TextRepository<Review> {
  public ReviewRepository(TextFileStore store) {
    super(store, "reviews", Review.class);
  }
}
