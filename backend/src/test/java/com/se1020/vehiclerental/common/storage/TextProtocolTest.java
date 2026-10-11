package com.se1020.vehiclerental.common.storage;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.text.*;
import com.se1020.vehiclerental.customer.*;
import com.se1020.vehiclerental.security.TokenService;
import com.se1020.vehiclerental.vehicle.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class TextProtocolTest {
  @TempDir Path directory;

  @Test
  void allSubtypesAndEscapedUnicodeSurviveRestart() {
    var store = new TextFileStore(directory.toString(), new StorageCoordinator());
    String unusual = "සිංහල தமிழ் 🚗\tA|B\\C\nD\rE";
    var car = new Car("ABC-1", "Toyota", "Aqua", new BigDecimal("7500.00"), unusual, 5, "AUTO");
    var bike = new Motorcycle("ABC-2", "Honda", "CB", new BigDecimal("2500.50"), "", 125);
    var customer = new Customer(unusual, "name@example.com", "$2a$preservedHash", "0771234567");
    var admin = new Admin("admin@example.com", "$2a$adminHash");
    store.write("users", User.class, List.of(customer, admin));
    store.write("vehicles", Vehicle.class, List.of(car, bike));
    var restart = new TextFileStore(directory.toString(), new StorageCoordinator());
    assertThat(TextMapper.toValue(restart.read("users", User.class)))
        .isEqualTo(TextMapper.toValue(List.of(customer, admin)));
    assertThat(TextMapper.toValue(restart.read("vehicles", Vehicle.class)))
        .isEqualTo(TextMapper.toValue(List.of(car, bike)));
    assertThat(restart.read("vehicles", Vehicle.class).get(1)).isInstanceOf(Motorcycle.class);
    assertThat(restart.read("users", User.class).get(1)).isInstanceOf(Admin.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "TRAVELER-TEXT-1\nlist\t1\n",
        "TRAVELER-TEXT-1\nboolean\tyes\n",
        "TRAVELER-TEXT-1\nobject\t2\nkey\tx\nnull\nkey\tx\nnull\n",
        "TRAVELER-TEXT-1\nstring\tbad\\x\n",
        "TRAVELER-TEXT-1\nnull\nnull\n",
        "TRAVELER-TEXT-1\nnumber\tNaN\n",
        "TRAVELER-TEXT-1\nlist\t-1\n"
      })
  void malformedTextIsRejected(String text) {
    assertThatThrownBy(() -> TextCodec.decode(text)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void legacyDirectoryIsNeverSilentlyReinitialized() throws Exception {
    Files.writeString(directory.resolve("users.json"), "legacy content");
    assertThatThrownBy(() -> new TextFileStore(directory.toString(), new StorageCoordinator()))
        .isInstanceOf(StorageException.class);
    assertThat(Files.exists(directory.resolve("users.txt"))).isFalse();
    assertThat(Files.readString(directory.resolve("users.json"))).isEqualTo("legacy content");
  }

  @Test
  void incompleteTextDatasetIsNeverSilentlyReseeded() throws Exception {
    var path = directory.resolve("users.txt");
    Files.writeString(path, "TRAVELER-TEXT-1\nlist\t0\n");
    assertThatThrownBy(() -> new TextFileStore(directory.toString(), new StorageCoordinator()))
        .isInstanceOf(StorageException.class);
    assertThat(Files.exists(directory.resolve("vehicles.txt"))).isFalse();
  }

  @Test
  void signedTokensRejectTamperingWrongKeyExpiryAndFutureIssuance() {
    String secret = Base64.getEncoder().encodeToString(new byte[32]);
    var clock = Clock.fixed(Instant.parse("2030-01-01T00:00:00Z"), ZoneOffset.UTC);
    var tokens = new TokenService(secret, 3600, clock);
    var user = new Customer("Name", "a@example.com", "hash", "0771234567");
    String token = tokens.issue(user);
    assertThat(tokens.verify(token)).isEqualTo(user.getId());
    assertThat(token).startsWith("t1.").doesNotContain("{");
    assertThatThrownBy(
            () ->
                tokens.verify(token.replace(user.getId().toString(), UUID.randomUUID().toString())))
        .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
    var otherKey = new byte[32];
    Arrays.fill(otherKey, (byte) 1);
    assertThatThrownBy(
            () ->
                new TokenService(Base64.getEncoder().encodeToString(otherKey), 3600, clock)
                    .verify(token))
        .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
    assertThatThrownBy(
            () ->
                new TokenService(secret, 3600, Clock.offset(clock, Duration.ofSeconds(3600)))
                    .verify(token))
        .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
    assertThatThrownBy(
            () ->
                new TokenService(secret, 3600, Clock.offset(clock, Duration.ofSeconds(-31)))
                    .verify(token))
        .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
  }
}
