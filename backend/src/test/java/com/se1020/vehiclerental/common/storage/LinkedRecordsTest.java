package com.se1020.vehiclerental.common.storage;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.*;
import com.se1020.vehiclerental.common.text.TextCodec;
import com.se1020.vehiclerental.maintenance.MaintenanceRecord;
import com.se1020.vehiclerental.review.Review;
import com.se1020.vehiclerental.support.Fixture;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class LinkedRecordsTest extends Fixture {
  @Test
  void restartPreservesAllFieldsRelationsTombstonesAndNestedEvents() throws Exception {
    var completed = completedBooking();
    var review =
        new Review(alice.getId(), car.getId(), completed.getId(), 5, "සිංහල\tline\nreview\\text");
    review.hide();
    reviews.save(review);
    maintenance.save(
        new MaintenanceRecord(
            car.getId(),
            "Oil\tfilter\nservice",
            new RentalPeriod(today.plusDays(10), today.plusDays(12)),
            new BigDecimal("3000.50")));
    var cancellation = book(15, 17);
    cancellation.requestCancellation(
        new CancellationWorkflow(
            cancellation.getId(), null, CancellationWorkflow.PaymentAction.NONE, null));
    bookings.save(cancellation);
    notificationService.deliverPending();
    for (var notification : notificationRecords.findAll()) {
      notification.markRead();
      notification.dismiss();
      notificationRecords.save(notification);
    }
    var before = new LinkedHashMap<String, Object>();
    for (String file : TextFileStore.FILES)
      before.put(file, TextCodec.decode(Files.readString(directory.resolve(file + ".txt"))));
    wire();
    assertThat(users.require(alice.getId()).getPasswordHash()).isEqualTo(alice.getPasswordHash());
    assertThat(bookings.require(completed.getId()).getVehicleId()).isEqualTo(car.getId());
    assertThat(bookings.require(cancellation.getId()).getCancellationWorkflow().getWorkflowId())
        .isEqualTo(cancellation.getCancellationWorkflow().getWorkflowId());
    assertThat(reviews.require(review.getId()).getDeletedAt()).isNotNull();
    assertThat(payments.findAll())
        .allSatisfy(p -> assertThat(p.getBookingId()).isEqualTo(completed.getId()));
    assertThat(notificationRecords.findAll())
        .allSatisfy(n -> assertThat(n.getDismissedAt()).isNotNull());
    notificationService.deliverPending();
    for (String file : TextFileStore.FILES)
      assertThat(TextCodec.decode(Files.readString(directory.resolve(file + ".txt"))))
          .isEqualTo(before.get(file));
  }
}
