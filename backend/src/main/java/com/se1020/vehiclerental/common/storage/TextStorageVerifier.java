package com.se1020.vehiclerental.common.storage;

import com.se1020.vehiclerental.booking.Booking;
import com.se1020.vehiclerental.common.text.*;
import com.se1020.vehiclerental.customer.User;
import com.se1020.vehiclerental.maintenance.MaintenanceRecord;
import com.se1020.vehiclerental.notification.Notification;
import com.se1020.vehiclerental.payment.Payment;
import com.se1020.vehiclerental.review.Review;
import com.se1020.vehiclerental.vehicle.Vehicle;
import java.nio.file.*;
import java.util.*;

/** Read-only offline verification; never initializes, repairs or rewrites business data. */
public final class TextStorageVerifier {
  private TextStorageVerifier() {}

  public static void main(String[] args) throws Exception {
    if (args.length != 1) throw new IllegalArgumentException("Provide the text data directory");
    Path directory = Path.of(args[0]);
    Class<?>[] types = {
      User.class,
      Vehicle.class,
      Booking.class,
      Payment.class,
      MaintenanceRecord.class,
      Review.class,
      Notification.class
    };
    for (int i = 0; i < types.length; i++) {
      String file = TextFileStore.FILES.get(i);
      Object value;
      try (var reader =
          Files.newBufferedReader(
              directory.resolve(file + ".txt"), java.nio.charset.StandardCharsets.UTF_8)) {
        value = TextCodec.read(reader);
      }
      if (!(value instanceof List<?> records))
        throw new IllegalArgumentException("Expected record list");
      Set<UUID> ids = new HashSet<>();
      for (Object record : records) {
        var entity =
            (com.se1020.vehiclerental.common.model.Entity)
                TextMapper.fromValue(record, types[i], true);
        if (!ids.add(entity.getId())) throw new IllegalArgumentException("Duplicate identity");
        // Equality after reconstruction proves no field was omitted or rewritten.
        if (!TextCodec.decode(TextCodec.encode(TextMapper.toValue(entity))).equals(record))
          throw new IllegalArgumentException("Record changed on reconstruction");
      }
      System.out.println(file + ": " + records.size() + " records verified");
    }
  }
}
