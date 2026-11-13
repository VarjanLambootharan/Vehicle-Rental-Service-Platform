package com.se1020.vehiclerental.deletion;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.*;
import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.text.TextCodec;
import com.se1020.vehiclerental.config.StorageIntegrityVerifier;
import com.se1020.vehiclerental.config.TextHttpConfig;
import com.se1020.vehiclerental.customer.Admin;
import com.se1020.vehiclerental.customer.Customer;
import com.se1020.vehiclerental.favorite.Favorite;
import com.se1020.vehiclerental.maintenance.*;
import com.se1020.vehiclerental.notification.NotificationType;
import com.se1020.vehiclerental.payment.*;
import com.se1020.vehiclerental.review.Review;
import com.se1020.vehiclerental.review.dto.ReviewRequest;
import com.se1020.vehiclerental.support.Fixture;
import com.se1020.vehiclerental.vehicleimage.VehicleImage;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.junit.jupiter.api.Test;

class HardDeletionServiceTest extends Fixture {
  @Test
  void customerDeletionCascadesAndRemovesPrimaryTextRecords() throws Exception {
    Booking booking = book(2, 4);
    Payment payment = payments.save(new Payment(booking.getId(), alice.getId(), booking.getTotalAmount(),
        PaymentMethod.MOCK_ONLINE, false));
    favorites.save(new Favorite(alice.getId(), car.getId()));
    notificationService.deliverPending();

    DeletionStatus status = deletionService.customer(alice.getId());

    assertThat(status.status()).isEqualTo("COMPLETED");
    assertThat(users.findAll()).noneMatch(u -> u.getId().equals(alice.getId()));
    assertThat(bookings.findAll()).noneMatch(b -> b.getId().equals(booking.getId()));
    assertThat(payments.findAll()).noneMatch(p -> p.getId().equals(payment.getId()));
    assertThat(favorites.findAll()).isEmpty();
    assertThat(notificationRecords.findAll()).noneMatch(n -> n.getRecipientUserId().equals(alice.getId()));
    assertThat(Files.readString(directory.resolve("users.txt"))).doesNotContain(alice.getId().toString());
    assertThat(store.deletionReceipts()).singleElement().satisfies(r ->
        assertThat(r.settlements()).anyMatch(s -> s.outcome().equals("NO_REFUND")));
  }

  @Test
  void vehicleDeletionCleansDependenciesAndPersistsCustomerSnapshot() throws Exception {
    Booking booking = book(2, 4);
    persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    favorites.save(new Favorite(alice.getId(), car.getId()));
    images.save(new VehicleImage(car.getId(), "https://example.test/a.png", "front", 0));
    maintenance.save(new MaintenanceRecord(car.getId(), "Service", new RentalPeriod(today.plusDays(8), today.plusDays(9)), BigDecimal.ZERO));

    as(admin);
    DeletionStatus deletion = deletionService.vehicle(car.getId());

    assertThat(vehicles.findAll()).isEmpty();
    assertThat(bookings.findAll()).isEmpty();
    assertThat(payments.findAll()).isEmpty();
    assertThat(maintenance.findAll()).isEmpty();
    assertThat(images.findAll()).isEmpty();
    assertThat(favorites.findAll()).isEmpty();
    assertThat(notificationRecords.findAll()).singleElement().satisfies(n -> {
      assertThat(n.getRecipientUserId()).isEqualTo(alice.getId());
      assertThat(n.getNotificationType()).isEqualTo(NotificationType.BOOKING_REMOVED_BY_ADMIN);
      assertThat(notificationRecords.hasSnapshot(n)).isTrue();
    });
    assertThat(Files.readString(directory.resolve("vehicles.txt"))).doesNotContain(car.getId().toString());
    assertThat(((DeletionAuditResponse) deletionService.receiptView(deletion.operationId())).reason())
        .isEqualTo("Not recorded");
    new StorageIntegrityVerifier(users, vehicles, bookings, payments, maintenance, reviews,
        notificationRecords, images, favorites).run(new DefaultApplicationArguments());
  }

  @Test
  void bookingDeletionSettlesFuturePaymentAndIsIdempotent() throws Exception {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);

    as(admin);
    var first = deletionService.booking(booking.getId());
    var repeated = deletionService.booking(booking.getId());

    assertThat(repeated.operationId()).isEqualTo(first.operationId());
    assertThat(bookings.findAll()).isEmpty();
    assertThat(payments.findAll()).noneMatch(p -> p.getId().equals(payment.getId()));
    assertThat(Files.readString(directory.resolve("bookings.txt"))).doesNotContain(booking.getId().toString());
    assertThat(store.deletionReceipts()).singleElement().satisfies(r ->
        assertThat(r.settlements()).singleElement().satisfies(s ->
            assertThat(s.outcome()).isEqualTo("SIMULATED_FULL_REFUND")));
  }

  @Test
  void paymentDeletionOnlyRemovesSettledObligationAndPreservesBooking() throws Exception {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.CASH_ON_PICKUP);
    as(admin);

    deletionService.payment(payment.getId());

    assertThat(bookings.require(booking.getId())).isNotNull();
    assertThat(payments.findAll()).isEmpty();
    assertThat(Files.readString(directory.resolve("payments.txt"))).doesNotContain(payment.getId().toString());
    assertThat(store.deletionReceipts()).singleElement().satisfies(r ->
        assertThat(r.settlements()).singleElement().satisfies(s -> assertThat(s.outcome()).isEqualTo("VOIDED")));
  }

  @Test
  void deletingRefundedCancellationPaymentClearsDurableWorkflowReferenceBeforeRestart() throws Exception {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    cancellationService.cancel(booking.getId());
    assertThat(payments.require(payment.getId()).getStatus()).isEqualTo(PaymentStatus.REFUNDED);

    as(admin);
    deletionService.payment(payment.getId());

    assertThat(payments.findAll()).noneMatch(p -> p.getId().equals(payment.getId()));
    assertThat(bookings.require(booking.getId()).getCancellationWorkflow()).isNull();
    assertThat(Files.readString(directory.resolve("payments.txt"))).doesNotContain(payment.getId().toString());
    assertThat(store.deletionReceipts()).singleElement().satisfies(receipt ->
        assertThat(receipt.settlements()).singleElement().satisfies(settlement ->
            assertThat(settlement.outcome()).isEqualTo("ALREADY_REFUNDED")));

    wire();
    assertThat(bookings.require(booking.getId()).getCancellationWorkflow()).isNull();
    new StorageIntegrityVerifier(users, vehicles, bookings, payments, maintenance, reviews,
        notificationRecords, images, favorites).run(new DefaultApplicationArguments());
  }

  @Test
  void bookingDeletionBlocksActiveRentalWithoutCreatingSettlement() {
    Booking booking = book(0, 4);
    persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    as(admin);
    bookingService.status(booking.getId(), BookingStatus.ACTIVE);

    as(alice);
    assertThatThrownBy(() -> deletionService.booking(booking.getId()))
        .hasMessageContaining("Resolve active");
    assertThat(bookings.require(booking.getId()).getStatus()).isEqualTo(BookingStatus.ACTIVE);
    assertThat(store.deletionReceipts()).isEmpty();
  }

  @Test
  void bookingDeletionDoesNotRefundCompletedRental() {
    Booking booking = completedBooking();

    deletionService.booking(booking.getId());

    assertThat(store.deletionReceipts()).singleElement().satisfies(receipt ->
        assertThat(receipt.settlements()).singleElement().satisfies(settlement ->
            assertThat(settlement.outcome()).isEqualTo("COMPLETED_NO_AUTO_REFUND")));
  }

  @Test
  void bookingDeletionBlocksCancellationPendingUntilRecoveryCompletes() {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    store.failOnWrite("payments", 1);
    assertThat(cancellationService.cancel(booking.getId()).status())
        .isEqualTo(BookingStatus.CANCELLATION_PENDING);

    assertThatThrownBy(() -> deletionService.booking(booking.getId()))
        .hasMessageContaining("cancellation-recovery");
    assertThat(bookings.require(booking.getId()).getStatus()).isEqualTo(BookingStatus.CANCELLATION_PENDING);
    assertThat(payments.require(payment.getId()).getStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(store.deletionReceipts()).isEmpty();
  }

  @Test
  void terminalFailedAndVoidedPaymentsAreRemovedWithoutRefunds() {
    Booking booking = book(2, 4);
    Payment failed = payments.save(new Payment(booking.getId(), alice.getId(), booking.getTotalAmount(),
        PaymentMethod.MOCK_ONLINE, false));
    Payment voided = persistedPayment(booking, PaymentMethod.CASH_ON_PICKUP);
    voided.transitionPending(PaymentStatus.VOIDED);
    payments.save(voided);

    as(admin);
    deletionService.payment(failed.getId());
    deletionService.payment(voided.getId());

    assertThat(payments.findAll()).isEmpty();
    assertThat(store.deletionReceipts()).allSatisfy(receipt ->
        assertThat(receipt.settlements()).singleElement().satisfies(settlement ->
            assertThat(settlement.simulatedRefund()).isEqualByComparingTo(BigDecimal.ZERO)));
  }

  @Test
  void maintenanceDeletionSupportsOnlyNonInProgressStoredStatuses() throws Exception {
    MaintenanceRecord scheduled = maintenance.save(new MaintenanceRecord(car.getId(), "Scheduled",
        new RentalPeriod(today.plusDays(8), today.plusDays(9)), BigDecimal.ZERO));
    MaintenanceRecord inProgress = maintenance.save(new MaintenanceRecord(car.getId(), "In progress",
        new RentalPeriod(today, today.plusDays(1)), BigDecimal.ZERO));
    inProgress.transition(MaintenanceStatus.IN_PROGRESS);
    maintenance.save(inProgress);
    MaintenanceRecord completed = maintenance.save(new MaintenanceRecord(car.getId(), "Completed",
        new RentalPeriod(today.plusDays(10), today.plusDays(11)), BigDecimal.ZERO));
    completed.transition(MaintenanceStatus.IN_PROGRESS);
    completed.transition(MaintenanceStatus.COMPLETED);
    maintenance.save(completed);
    MaintenanceRecord cancelled = maintenance.save(new MaintenanceRecord(car.getId(), "Cancelled",
        new RentalPeriod(today.plusDays(12), today.plusDays(13)), BigDecimal.ZERO));
    cancelled.transition(MaintenanceStatus.CANCELLED);
    maintenance.save(cancelled);

    as(admin);
    deletionService.maintenance(scheduled.getId());
    assertThatThrownBy(() -> deletionService.maintenance(inProgress.getId()))
        .hasMessageContaining("in-progress maintenance");
    deletionService.maintenance(completed.getId());
    deletionService.maintenance(cancelled.getId());

    assertThat(maintenance.findAll()).singleElement().extracting(MaintenanceRecord::getId)
        .isEqualTo(inProgress.getId());
    String primary = Files.readString(directory.resolve("maintenance.txt"));
    assertThat(primary).doesNotContain(scheduled.getId().toString(), completed.getId().toString(),
        cancelled.getId().toString());
    assertThat(primary).contains(inProgress.getId().toString());
  }

  @Test
  void maintenanceDeletionBlocksInProgressRecordWithoutMutation() throws Exception {
    MaintenanceRecord record = maintenance.save(new MaintenanceRecord(car.getId(), "Repair", new RentalPeriod(today, today.plusDays(2)), BigDecimal.TEN));
    record.transition(MaintenanceStatus.IN_PROGRESS);
    maintenance.save(record);
    as(admin);

    assertThatThrownBy(() -> deletionService.maintenance(record.getId()))
        .hasMessageContaining("in-progress maintenance");
    assertThat(maintenance.findAll()).singleElement().extracting(MaintenanceRecord::getId)
        .isEqualTo(record.getId());
    assertThat(Files.readString(directory.resolve("maintenance.txt"))).contains(record.getId().toString());
    assertThat(store.deletionReceipts()).isEmpty();
  }

  @Test
  void reviewDeletionPhysicallyRemovesReviewAndItsEvents() throws Exception {
    Booking booking = completedBooking();
    as(alice);
    var review = reviewService.create(new ReviewRequest(booking.getId(), car.getId(), 5, "Great"));
    notificationService.deliverPending();

    deletionService.review(review.id());
    notificationService.deliverPending();

    assertThat(reviews.findAll()).isEmpty();
    assertThat(Files.readString(directory.resolve("reviews.txt"))).doesNotContain(review.id().toString());
    assertThat(notificationRecords.findAll()).noneMatch(n -> n.getRelatedEntityId().equals(review.id()));
  }

  @Test
  void notificationDeletionRemovesReplayEventAndRestartRecoveryCompletes() throws Exception {
    Booking booking = book(2, 4);
    notificationService.deliverPending();
    var notice = notificationRecords.findAll().getFirst();

    deletionService.notification(notice.getId());
    notificationService.deliverPending();

    assertThat(notificationRecords.findAll()).isEmpty();
    assertThat(bookings.require(booking.getId()).getEvents()).isEmpty();
    assertThat(Files.readString(directory.resolve("notifications.txt"))).doesNotContain(notice.getId().toString());
  }

  @Test
  void notificationBatchRetryWithoutNewNotificationsReusesItsDurableOperation() {
    book(1, 3);

    DeletionStatus first = deletionService.notifications();
    DeletionStatus retry = deletionService.notifications();

    assertThat(retry.operationId()).isEqualTo(first.operationId());
    assertThat(notificationRecords.findAll()).isEmpty();
    assertThat(bookings.require(bookings.findAll().getFirst().getId()).getEvents()).isEmpty();
    assertThat(store.deletionReceipts()).hasSize(1);
  }

  @Test
  void interruptedDeletionRecoversAfterRewireWithoutRestoringRecords() {
    Booking booking = book(2, 4);
    persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    store.failOnWrite("payments", 1);

    as(admin);
    var pending = deletionService.booking(booking.getId());
    assertThat(pending.status()).isEqualTo("PENDING");

    wire();
    assertThat(bookings.findAll()).isEmpty();
    assertThat(payments.findAll()).isEmpty();
    assertThat(store.deletionStatus(pending.operationId()).status()).isEqualTo("COMPLETED");
  }

  @Test
  void concurrentDuplicateRequestsShareOneDurableOperation() throws Exception {
    Booking booking = book(2, 4);
    try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
      var calls = java.util.List.of(
          pool.submit(() -> { as(alice); return deletionService.booking(booking.getId()); }),
          pool.submit(() -> { as(alice); return deletionService.booking(booking.getId()); }));
      DeletionStatus one = calls.getFirst().get(10, TimeUnit.SECONDS);
      DeletionStatus two = calls.getLast().get(10, TimeUnit.SECONDS);
      assertThat(two.operationId()).isEqualTo(one.operationId());
    }
    assertThat(store.deletionReceipts()).hasSize(1);
  }

  @Test
  void previewAwareVehicleDeletionPersistsSettlementAndAuthorizesCustomerReceipt() {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    as(admin);

    DeletionPreview preview = deletionService.preview("vehicle", car.getId());
    assertThat(preview.blocked()).isFalse();
    assertThat(preview.simulatedRefundTotal()).isEqualByComparingTo(payment.getAmount());
    DeletionStatus status = deletionService.execute("vehicle", car.getId(),
        new DeletionExecutionRequest(preview.impactHash(), "VEHICLE_UNAVAILABLE", true));

    assertThat(status.status()).isEqualTo("COMPLETED");
    as(alice);
    DeletionReceiptResponse receipt = deletionService.receipt(status.operationId());
    assertThat(receipt.settlements()).singleElement().satisfies(s -> {
      assertThat(s.outcome()).isEqualTo("SIMULATED_FULL_REFUND");
      assertThat(s.simulatedRefund()).isEqualByComparingTo(payment.getAmount());
    });
    assertThat(notificationRecords.findAll()).singleElement().satisfies(n ->
        assertThat(n.getNotificationType()).isEqualTo(NotificationType.BOOKING_REMOVED_BY_ADMIN));
  }

  @Test
  void vehicleReceiptScopesSettlementsToTheCustomerAndLetsEveryAdministratorAuditIt()
      throws Exception {
    Customer charlie = new Customer("Charlie", "charlie@example.com", "test-only-hash", "0771234569");
    Admin secondAdmin = new Admin("second-admin@example.com", "test-only-hash");
    users.save(charlie);
    users.save(secondAdmin);
    Booking aliceBooking = book(2, 4);
    Payment alicePayment = persistedPayment(aliceBooking, PaymentMethod.MOCK_ONLINE);
    as(bob);
    Booking bobBooking = bookings.require(bookingService.create(
        new com.se1020.vehiclerental.booking.dto.BookingRequest(car.getId(), today.plusDays(5), today.plusDays(8))).id());
    Payment bobPayment = payments.save(new Payment(bobBooking.getId(), bob.getId(), bobBooking.getTotalAmount(),
        PaymentMethod.MOCK_ONLINE, true));

    as(admin);
    DeletionStatus first = deletionService.vehicle(car.getId());
    DeletionStatus repeated = deletionService.vehicle(car.getId());
    assertThat(repeated.operationId()).isEqualTo(first.operationId());
    assertThat(store.deletionReceipts()).singleElement().satisfies(receipt -> {
      assertThat(receipt.settlements()).hasSize(2);
      assertThat(receipt.dependencies()).contains(
          "settlement-owner:" + alicePayment.getId() + ":" + aliceBooking.getId() + ":" + alice.getId(),
          "settlement-owner:" + bobPayment.getId() + ":" + bobBooking.getId() + ":" + bob.getId());
    });
    assertThat(notificationRecords.findAll()).hasSize(2);

    as(alice);
    DeletionReceiptResponse aliceReceipt = deletionService.receipt(first.operationId());
    assertThat(aliceReceipt.settlements()).singleElement().satisfies(settlement -> {
      assertThat(settlement.paymentId()).isEqualTo(alicePayment.getId());
      assertThat(settlement.bookingId()).isEqualTo(aliceBooking.getId());
      assertThat(settlement.amount()).isEqualByComparingTo("15000.00");
    });
    assertThat(aliceReceipt.notificationCount()).isZero();
    assertThat(deletionService.settlementsMine()).singleElement().satisfies(response ->
        assertThat(response.settlements()).allSatisfy(s -> assertThat(s.paymentId()).isEqualTo(alicePayment.getId())));
    assertThatThrownBy(() -> deletionService.status(first.operationId())).isInstanceOf(AccessDeniedException.class);

    DeletionController controller = new DeletionController(deletionService);
    List<HttpMessageConverter<?>> converters = new ArrayList<>();
    new TextHttpConfig().configureMessageConverters(converters);
    MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setMessageConverters(converters.toArray(HttpMessageConverter[]::new)).build();
    String customerHttpBody = mockMvc.perform(MockMvcRequestBuilders
            .get("/api/v1/deletions/" + first.operationId() + "/receipt").accept(MediaType.TEXT_PLAIN))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(customerHttpBody).doesNotContain(bobPayment.getId().toString(), bobBooking.getId().toString(),
        bobPayment.getAmount().toPlainString());
    @SuppressWarnings("unchecked")
    Map<Object, Object> serializedReceipt = (Map<Object, Object>) TextCodec.decode(customerHttpBody);
    assertThat(serializedReceipt).containsOnlyKeys("operationId", "kind", "targetId", "requestedAt",
        "settlements", "notificationCount", "status");

    as(bob);
    DeletionReceiptResponse bobReceipt = deletionService.receipt(first.operationId());
    assertThat(bobReceipt.settlements()).singleElement().satisfies(settlement -> {
      assertThat(settlement.paymentId()).isEqualTo(bobPayment.getId());
      assertThat(settlement.bookingId()).isEqualTo(bobBooking.getId());
      assertThat(settlement.amount()).isEqualByComparingTo("22500.00");
    });
    assertThat(deletionService.settlementsMine()).singleElement().satisfies(response ->
        assertThat(response.settlements()).allSatisfy(s -> assertThat(s.paymentId()).isEqualTo(bobPayment.getId())));
    String bobHttpBody = mockMvc.perform(MockMvcRequestBuilders
            .get("/api/v1/deletions/" + first.operationId() + "/receipt").accept(MediaType.TEXT_PLAIN))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(bobHttpBody).doesNotContain(alicePayment.getId().toString(), aliceBooking.getId().toString(),
        alicePayment.getAmount().toPlainString());

    as(charlie);
    assertThatThrownBy(() -> deletionService.receipt(first.operationId()))
        .isInstanceOf(com.se1020.vehiclerental.common.exception.BusinessException.class)
        .hasMessageContaining("access");

    as(admin);
    assertThat(deletionService.receipt(first.operationId()).settlements()).hasSize(2);
    String adminHttpBody = mockMvc.perform(MockMvcRequestBuilders
            .get("/api/v1/deletions/" + first.operationId() + "/receipt").accept(MediaType.TEXT_PLAIN))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andReturn().getResponse().getContentAsString();
    @SuppressWarnings("unchecked")
    Map<Object, Object> serializedAudit = (Map<Object, Object>) TextCodec.decode(adminHttpBody);
    assertThat(serializedAudit).containsKeys("actorId", "reason", "affectedRecords", "simulatedRefundTotal");
    as(secondAdmin);
    assertThat(deletionService.receipt(first.operationId()).settlements()).hasSize(2);
    assertThat(deletionService.status(first.operationId()).status()).isEqualTo("COMPLETED");
    assertThat(deletionService.history()).singleElement().satisfies(receipt ->
        assertThat(receipt.settlements()).hasSize(2));
    assertThatThrownBy(deletionService::settlementsMine).isInstanceOf(AccessDeniedException.class);

    wire();
    as(alice);
    assertThat(deletionService.receipt(first.operationId()).settlements()).singleElement()
        .extracting(DeletionReceiptResponse.Settlement::paymentId).isEqualTo(alicePayment.getId());
  }

  @Test
  void ambiguousLegacyReceiptRemainsReadableToAdministratorsButFailsClosedForCustomers() {
    UUID operationId = UUID.randomUUID();
    DeletionReceipt legacy = new DeletionReceipt(operationId, "VEHICLE", car.getId(), admin.getId(), admin.getId(),
        Instant.now(), List.of("recipient:" + alice.getId()), List.of(
            new DeletionReceipt.Settlement(UUID.randomUUID(), UUID.randomUUID(), "PAID",
                "SIMULATED_FULL_REFUND", new BigDecimal("15000.00"), new BigDecimal("15000.00"),
                "future-booking", "workflow-a"),
            new DeletionReceipt.Settlement(UUID.randomUUID(), UUID.randomUUID(), "PAID",
                "SIMULATED_FULL_REFUND", new BigDecimal("22500.00"), new BigDecimal("22500.00"),
                "future-booking", "workflow-b")), List.of("notification-proof"));
    store.deleteAtomically(legacy, Map.of());

    as(alice);
    DeletionReceiptResponse customerView = deletionService.receipt(operationId);
    assertThat(customerView.settlements()).isEmpty();
    assertThat(customerView.notificationCount()).isZero();
    assertThat(deletionService.settlementsMine()).isEmpty();

    as(admin);
    DeletionReceiptResponse adminView = deletionService.receipt(operationId);
    assertThat(adminView.settlements()).hasSize(2);
    assertThat(adminView.notificationCount()).isEqualTo(1);
  }

  @Test
  void deletedCustomerCannotReadAReceiptUsingStaleAuthentication() {
    DeletionStatus status = deletionService.customer(alice.getId());

    as(alice);
    assertThatThrownBy(() -> deletionService.receipt(status.operationId()))
        .isInstanceOf(BadCredentialsException.class)
        .hasMessageContaining("Invalid account");
  }

  @Test
  void stalePreviewAndDirectPaidPaymentDeletionAreBlockedWithoutMutation() {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    as(admin);
    DeletionPreview preview = deletionService.preview("payment", payment.getId());

    assertThat(preview.blocked()).isTrue();
    assertThatThrownBy(() -> deletionService.execute("payment", payment.getId(),
        new DeletionExecutionRequest("outdated", "POST_SETTLEMENT_CLEANUP", true)))
        .hasMessageContaining("paid confirmed booking");
    assertThatThrownBy(() -> deletionService.payment(payment.getId()))
        .hasMessageContaining("Cancel and settle");
    assertThat(payments.require(payment.getId()).getStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(bookings.require(booking.getId()).getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    assertThat(store.deletionReceipts()).isEmpty();
  }

  @Test
  void vehiclePreviewMatchesFutureAndAggregatedHistoricalNoticeConsequences() {
    Booking future = book(2, 4);
    Payment futurePayment = persistedPayment(future, PaymentMethod.MOCK_ONLINE);
    completedBooking();
    as(admin);

    DeletionPreview preview = deletionService.preview("VEHICLE", car.getId());

    assertThat(preview.simulatedRefundTotal()).isEqualByComparingTo(futurePayment.getAmount());
    assertThat(preview.pendingVoids()).isZero();
    assertThat(preview.historicalBookings()).isEqualTo(1);
    assertThat(preview.customerNotifications()).isEqualTo(2);
    DeletionStatus status = deletionService.execute("VEHICLE", car.getId(),
        new DeletionExecutionRequest(preview.impactHash(), "VEHICLE_UNAVAILABLE", true));
    assertThat(store.deletionReceipt(status.operationId()).orElseThrow().notificationProofs()).hasSize(2);
  }

  @Test
  void paymentPreviewIncludesOnlyTheSelectedPaymentAndItsActualVoid() {
    Booking booking = book(2, 4);
    Payment selected = payments.save(new Payment(booking.getId(), alice.getId(), booking.getTotalAmount(),
        PaymentMethod.CASH_ON_PICKUP, false));
    Payment other = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    as(admin);

    DeletionPreview preview = deletionService.preview("PAYMENT", selected.getId());

    assertThat(preview.payments()).isEqualTo(1);
    assertThat(preview.pendingVoids()).isEqualTo(1);
    assertThat(preview.simulatedRefundTotal()).isEqualByComparingTo(BigDecimal.ZERO);
    deletionService.execute("PAYMENT", selected.getId(),
        new DeletionExecutionRequest(preview.impactHash(), "POST_SETTLEMENT_CLEANUP", true));
    assertThat(payments.findAll()).extracting(Payment::getId).containsExactly(other.getId());
  }

  @Test
  void administratorAuditProjectionIncludesActorReasonCountsAndSettlementSummary() {
    Booking booking = book(2, 4);
    Payment payment = persistedPayment(booking, PaymentMethod.MOCK_ONLINE);
    as(admin);
    DeletionPreview preview = deletionService.preview("VEHICLE", car.getId());
    DeletionStatus status = deletionService.execute("VEHICLE", car.getId(),
        new DeletionExecutionRequest(preview.impactHash(), "VEHICLE_UNAVAILABLE", true));

    DeletionAuditResponse audit = (DeletionAuditResponse) deletionService.receiptView(status.operationId());
    assertThat(audit.actorId()).isEqualTo(admin.getId());
    assertThat(audit.reason()).isEqualTo("VEHICLE_UNAVAILABLE");
    assertThat(audit.affectedRecords().bookings()).isEqualTo(1);
    assertThat(audit.affectedRecords().payments()).isEqualTo(1);
    assertThat(audit.simulatedRefundTotal()).isEqualByComparingTo(payment.getAmount());
    assertThat(audit.notificationCount()).isEqualTo(1);
  }

  @Test
  void permissionsPreserveOwnershipAndAdminBoundaries() {
    Booking booking = book(2, 4);
    as(bob);
    assertThatThrownBy(() -> deletionService.booking(booking.getId()))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> deletionService.vehicle(car.getId()))
        .isInstanceOf(AccessDeniedException.class);
    assertThat(bookings.require(booking.getId())).isNotNull();
    assertThat(vehicles.require(car.getId())).isNotNull();
  }

  @Test
  void previewAwareCustomerDeletionUsesTheLegacyPlanAfterAcknowledgement() {
    DeletionPreview preview = deletionService.preview("CUSTOMER", alice.getId());

    DeletionStatus status = deletionService.execute("CUSTOMER", alice.getId(),
        new DeletionExecutionRequest(preview.impactHash(), "CUSTOMER_REQUEST", true));

    assertThat(store.deletionReceipt(status.operationId()).orElseThrow().kind()).isEqualTo("CUSTOMER");
    assertThat(store.deletionReceipt(status.operationId()).orElseThrow().dependencies())
        .contains("reason:CUSTOMER_REQUEST");
    assertThatThrownBy(() -> users.require(alice.getId())).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void previewAwareBookingDeletionUsesTheLegacyPlanAfterAcknowledgement() {
    Booking booking = book(2, 4);
    DeletionPreview preview = deletionService.preview("BOOKING", booking.getId());

    DeletionStatus status = deletionService.execute("BOOKING", booking.getId(),
        new DeletionExecutionRequest(preview.impactHash(), "CUSTOMER_REQUEST", true));

    assertThat(store.deletionReceipt(status.operationId()).orElseThrow().kind()).isEqualTo("BOOKING");
    assertThatThrownBy(() -> bookings.require(booking.getId())).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void previewAwareMaintenanceDeletionUsesTheLegacyPlanAfterAcknowledgement() {
    as(admin);
    var record = maintenanceService.create(new com.se1020.vehiclerental.maintenance.dto.MaintenanceRequest(
        car.getId(), "Audit service", today.plusDays(10), today.plusDays(11), new BigDecimal("500.00")));
    DeletionPreview preview = deletionService.preview("MAINTENANCE", record.id());

    DeletionStatus status = deletionService.execute("MAINTENANCE", record.id(),
        new DeletionExecutionRequest(preview.impactHash(), "OTHER", true));

    assertThat(store.deletionReceipt(status.operationId()).orElseThrow().kind()).isEqualTo("MAINTENANCE");
    assertThatThrownBy(() -> maintenance.require(record.id())).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void previewAwareReviewDeletionUsesTheLegacyPlanAfterAcknowledgement() {
    Booking completed = completedBooking();
    var review = reviewService.create(new com.se1020.vehiclerental.review.dto.ReviewRequest(
        completed.getId(), car.getId(), 5, "Audit review"));
    DeletionPreview preview = deletionService.preview("REVIEW", review.id());

    DeletionStatus status = deletionService.execute("REVIEW", review.id(),
        new DeletionExecutionRequest(preview.impactHash(), "OTHER", true));

    assertThat(store.deletionReceipt(status.operationId()).orElseThrow().kind()).isEqualTo("REVIEW");
    assertThatThrownBy(() -> reviews.require(review.id())).isInstanceOf(ResourceNotFoundException.class);
  }
}
