package com.se1020.vehiclerental.booking;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class BookingRepository extends TextRepository<Booking> {
  public BookingRepository(TextFileStore store) {
    super(store, "bookings", Booking.class);
  }
}
