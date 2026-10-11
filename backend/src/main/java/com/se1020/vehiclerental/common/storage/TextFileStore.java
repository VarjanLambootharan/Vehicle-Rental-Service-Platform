package com.se1020.vehiclerental.common.storage;

import com.se1020.vehiclerental.common.model.Entity;
import com.se1020.vehiclerental.common.text.TextCodec;
import com.se1020.vehiclerental.common.text.TextMapper;
import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.function.UnaryOperator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TextFileStore {
  public static final List<String> FILES =
      List.of(
          "users", "vehicles", "bookings", "payments", "maintenance", "reviews", "notifications");
  private final Path directory;
  private final StorageCoordinator coordinator;

  public TextFileStore(@Value("${app.storage.path}") String path, StorageCoordinator coordinator) {
    this.directory = Path.of(path).toAbsolutePath().normalize();
    this.coordinator = coordinator;
    coordinator.locked(
        () -> {
          try {
            Files.createDirectories(directory.resolve("backups"));
            for (String file : FILES)
              if (Files.exists(directory.resolve(file + ".json")))
                throw new IOException(
                    "Legacy storage detected; complete the offline migration first");
            long existing = FILES.stream().filter(file -> Files.exists(path(file))).count();
            if (existing != 0 && existing != FILES.size())
              throw new IOException(
                  "Incomplete text dataset; restore missing files instead of reseeding");
            for (String file : FILES) {
              Path target = path(file);
              if (!Files.exists(target)) {
                String seed = "TRAVELER-TEXT-1\nlist\t0\n";
                if (file.equals("users") || file.equals("vehicles")) {
                  try (InputStream in =
                      getClass().getResourceAsStream("/data/seed/" + file + ".txt")) {
                    if (in == null) throw new IOException("Missing seed " + file);
                    seed = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                  }
                }
                writeValue(file, TextCodec.decode(seed));
              }
              read(file, recordType(file));
            }
          } catch (IOException e) {
            throw new StorageException(
                "Storage initialization failed at "
                    + directory
                    + "; preserve files and restore a verified backup",
                e);
          }
        });
  }

  private Path path(String file) {
    if (!FILES.contains(file)) throw new IllegalArgumentException("Unknown business file");
    return directory.resolve(file + ".txt");
  }

  public <T> List<T> read(String file, Class<T> type) {
    return coordinator.locked(
        () -> {
          try {
            Object document;
            try (BufferedReader reader =
                Files.newBufferedReader(path(file), StandardCharsets.UTF_8)) {
              document = TextCodec.read(reader);
            }
            if (!(document instanceof List<?> records))
              throw new IOException("Expected record list");
            var result = new ArrayList<T>();
            for (Object record : records) result.add(TextMapper.fromValue(record, type, true));
            if (result == null || result.stream().anyMatch(Objects::isNull))
              throw new IOException("Invalid record array");
            Set<UUID> ids = new HashSet<>();
            for (T value : result)
              if (value instanceof Entity e
                  && (e.getId() == null
                      || !ids.add(e.getId())
                      || e.getCreatedAt() == null
                      || e.getUpdatedAt() == null))
                throw new IOException("Invalid or duplicate record identity");
            return result;
          } catch (IOException | RuntimeException e) {
            throw new StorageException("Cannot read " + file + "; file may be corrupted", e);
          }
        });
  }

  private static Class<?> recordType(String file) {
    return switch (file) {
      case "users" -> com.se1020.vehiclerental.customer.User.class;
      case "vehicles" -> com.se1020.vehiclerental.vehicle.Vehicle.class;
      case "bookings" -> com.se1020.vehiclerental.booking.Booking.class;
      case "payments" -> com.se1020.vehiclerental.payment.Payment.class;
      case "maintenance" -> com.se1020.vehiclerental.maintenance.MaintenanceRecord.class;
      case "reviews" -> com.se1020.vehiclerental.review.Review.class;
      case "notifications" -> com.se1020.vehiclerental.notification.Notification.class;
      default -> throw new IllegalArgumentException("Unknown business file");
    };
  }

  public <T> void write(String file, Class<T> type, List<T> values) {
    coordinator.locked(
        () -> {
          try {
            Object document = TextMapper.toValue(values);
            // Validate the same typed document before committing it to disk.
            Set<UUID> ids = new HashSet<>();
            for (Object item : (List<?>) document) {
              T decoded = TextMapper.fromValue(item, type, true);
              if (!(decoded instanceof Entity entity)
                  || entity.getId() == null
                  || !ids.add(entity.getId()))
                throw new IllegalArgumentException("Invalid or duplicate identity");
            }
            writeValue(file, document);
          } catch (IOException | RuntimeException e) {
            throw new StorageException("Cannot persist " + file, e);
          }
        });
  }

  public <T> List<T> update(String file, Class<T> type, UnaryOperator<List<T>> action) {
    return coordinator.locked(
        () -> {
          List<T> next = action.apply(read(file, type));
          write(file, type, next);
          return next;
        });
  }

  private void writeValue(String file, Object document) throws IOException {
    Path target = path(file), temporary = Files.createTempFile(directory, file + "-", ".tmp");
    try {
      try (BufferedWriter writer = Files.newBufferedWriter(temporary, StandardCharsets.UTF_8)) {
        TextCodec.write(writer, document);
      }
      try (FileChannel channel = FileChannel.open(temporary, StandardOpenOption.WRITE)) {
        channel.force(true);
      }
      if (Files.exists(target)) {
        Path backup =
            directory
                .resolve("backups")
                .resolve(
                    file + "-" + System.currentTimeMillis() + "-" + UUID.randomUUID() + ".txt");
        Files.copy(target, backup);
        try (FileChannel channel = FileChannel.open(backup, StandardOpenOption.WRITE)) {
          channel.force(true);
        }
        retainBackups(file);
      }
      replaceAtomically(temporary, target);
    } finally {
      Files.deleteIfExists(temporary);
    }
  }

  /** No non-atomic fallback: a failed move leaves the last committed file intact. */
  protected void replaceAtomically(Path source, Path target) throws IOException {
    Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
  }

  private void retainBackups(String file) throws IOException {
    try (var files = Files.list(directory.resolve("backups"))) {
      var backups =
          files
              .filter(
                  p ->
                      p.getFileName().toString().startsWith(file + "-")
                          && p.toString().endsWith(".txt"))
              .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
              .toList();
      for (int i = 5; i < backups.size(); i++) Files.delete(backups.get(i));
    }
  }
}
