package com.se1020.vehiclerental.config;

import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.customer.Admin;
import com.se1020.vehiclerental.customer.CustomerRepository;
import com.se1020.vehiclerental.customer.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class AdminInitializer implements ApplicationRunner {
  private final CustomerRepository users;
  private final StorageCoordinator coordinator;
  private final PasswordEncoder encoder;
  private final String email, password;

  public AdminInitializer(
      CustomerRepository users,
      StorageCoordinator coordinator,
      PasswordEncoder encoder,
      @Value("${app.admin.email}") String email,
      @Value("${app.admin.password}") String password) {
    this.users = users;
    this.coordinator = coordinator;
    this.encoder = encoder;
    this.email = email;
    this.password = password;
  }

  @Override
  public void run(ApplicationArguments args) {
    coordinator.locked(
        () -> {
          var existing = users.findAll();
          if (!existing.isEmpty()) {
            if (existing.stream().noneMatch(u -> u.getRole() == Role.ADMIN && u.isActive()))
              throw new IllegalStateException(
                  "Users exist without an active administrator. Stop and follow docs/recovery.md;"
                      + " accounts have not been replaced.");
            return;
          }
          if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
              || password.length() < 12
              || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
              || password.startsWith("<"))
            throw new IllegalStateException(
                "An empty user store requires ADMIN_EMAIL and a strong ADMIN_PASSWORD of 12–72"
                    + " UTF-8 bytes");
          users.save(new Admin(email, encoder.encode(password)));
        });
  }
}
