package com.se1020.vehiclerental.common.storage;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.booking.Booking;
import com.se1020.vehiclerental.booking.RentalPeriod;
import com.se1020.vehiclerental.common.text.*;
import com.se1020.vehiclerental.customer.Customer;
import com.se1020.vehiclerental.customer.User;
import com.se1020.vehiclerental.vehicle.Car;
import com.se1020.vehiclerental.vehicle.Vehicle;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;

public class TextFileStoreTest {
  @TempDir Path directory;
  TextFileStore store;

  @BeforeEach
  void setup() {
    store = new TextFileStore(directory.toString(), new StorageCoordinator());
  }

  @Test
  void initializesExactlySevenPrimaryFiles() throws Exception {
    try (var paths = Files.list(directory)) {
      assertThat(paths.filter(p -> p.toString().endsWith(".txt")).count()).isEqualTo(7);
    }
    assertThat(store.read("users", User.class)).isEmpty();
  }

  @Test
  void polymorphicRoundTripAndPersistenceAfterRestart() {
    var car =
        new Car(
            "ABC",
            "Toyota",
            "Aqua",
            new BigDecimal("10.50"),
            "Ã Â·Æ’Ã Â·â€™Ã Â¶â€šÃ Â·â€žÃ Â¶Â½",
            5,
            "AUTO");
    store.write("vehicles", Vehicle.class, List.of(car));
    var restarted = new TextFileStore(directory.toString(), new StorageCoordinator());
    var result = restarted.read("vehicles", Vehicle.class).getFirst();
    assertThat(result).isInstanceOf(Car.class);
    assertThat(result.getDescription()).isEqualTo("Ã Â·Æ’Ã Â·â€™Ã Â¶â€šÃ Â·â€žÃ Â¶Â½");
    assertThat(result.getId()).isEqualTo(car.getId());
  }

  @Test
  void nestedPeriodAndPrivateEventsRoundTrip() throws Exception {
    var booking =
        new Booking(
            UUID.randomUUID(),
            UUID.randomUUID(),
            new RentalPeriod(LocalDate.of(2030, 1, 1), LocalDate.of(2030, 1, 3)),
            BigDecimal.TEN);
    store.write("bookings", Booking.class, List.of(booking));
    String text = Files.readString(directory.resolve("bookings.txt"));
    assertThat(text).contains("rentalPeriod", "pickupDate", "returnDate", "events");
    assertThat(store.read("bookings", Booking.class).getFirst().getEvents()).hasSize(1);
  }

  @Test
  void corruptExistingFileFailsWithoutOverwrite() throws Exception {
    var path = directory.resolve("users.txt");
    Files.writeString(path, "[broken]");
    assertThatThrownBy(() -> new TextFileStore(directory.toString(), new StorageCoordinator()))
        .isInstanceOf(StorageException.class);
    assertThat(Files.readString(path)).isEqualTo("[broken]");
  }

  @Test
  void rejectsWrongRootAndUnknownSubtype() throws Exception {
    Files.writeString(directory.resolve("vehicles.txt"), TextCodec.encode(Map.of()));
    assertThatThrownBy(() -> new TextFileStore(directory.toString(), new StorageCoordinator()))
        .isInstanceOf(StorageException.class);
    Files.writeString(
        directory.resolve("vehicles.txt"), TextCodec.encode(List.of(Map.of("type", "TRUCK"))));
    assertThatThrownBy(() -> store.read("vehicles", Vehicle.class))
        .isInstanceOf(StorageException.class);
  }

  @Test
  void backupsRetainedAndTemporaryFilesRemoved() throws Exception {
    for (int i = 0; i < 9; i++)
      store.write(
          "users",
          User.class,
          List.of(new Customer("Name", "email@example.com", "hash", "1234567")));
    try (var paths = Files.list(directory.resolve("backups"))) {
      assertThat(paths.count()).isEqualTo(5);
    }
    try (var paths = Files.list(directory)) {
      assertThat(paths.noneMatch(p -> p.toString().endsWith(".tmp"))).isTrue();
    }
  }

  @Test
  void unsupportedAtomicMoveLeavesCommittedFileIntact() {
    var failing =
        new TextFileStore(directory.toString(), new StorageCoordinator()) {
          @Override
          protected void replaceAtomically(Path source, Path target) throws IOException {
            throw new AtomicMoveNotSupportedException(source.toString(), target.toString(), "test");
          }
        };
    assertThatThrownBy(
            () ->
                failing.write(
                    "users",
                    User.class,
                    List.of(new Customer("Name", "email@example.com", "hash", "1234567"))))
        .isInstanceOf(StorageException.class);
    assertThat(store.read("users", User.class)).isEmpty();
  }

  @Test
  void concurrentReadModifyWriteDoesNotLoseRecords() throws Exception {
    try (var pool = java.util.concurrent.Executors.newFixedThreadPool(6)) {
      var futures = new ArrayList<java.util.concurrent.Future<?>>();
      for (int i = 0; i < 18; i++)
        futures.add(
            pool.submit(
                () ->
                    store.update(
                        "users",
                        User.class,
                        list -> {
                          list.add(
                              new Customer(
                                  "Name", UUID.randomUUID() + "@example.com", "hash", "1234567"));
                          return list;
                        })));
      for (var f : futures) f.get();
      assertThat(store.read("users", User.class)).hasSize(18);
    }
  }

  @Test
  void duplicateIdsAreCorruption() {
    var customer = new Customer("Name", "email@example.com", "hash", "1234567");
    assertThatThrownBy(() -> store.write("users", User.class, List.of(customer, customer)))
        .isInstanceOf(StorageException.class);
  }

  @Test
  void missingRequiredFieldsDoNotInventReplacementIdentity() throws Exception {
    Files.writeString(
        directory.resolve("users.txt"),
        TextCodec.encode(List.of(Map.of("type", "CUSTOMER", "email", "a@example.com"))));
    assertThatThrownBy(() -> store.read("users", User.class)).isInstanceOf(StorageException.class);
  }
}
