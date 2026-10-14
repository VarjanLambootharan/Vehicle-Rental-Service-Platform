package com.se1020.vehiclerental.auth;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.auth.dto.AuthResponse;
import com.se1020.vehiclerental.auth.dto.LoginRequest;
import com.se1020.vehiclerental.auth.dto.RegisterRequest;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.customer.Customer;
import com.se1020.vehiclerental.customer.CustomerRepository;
import com.se1020.vehiclerental.customer.User;
import com.se1020.vehiclerental.customer.dto.CustomerResponse;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.security.TokenService;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private final CustomerRepository users;
  private final StorageCoordinator coordinator;
  private final org.springframework.security.crypto.password.PasswordEncoder encoder;
  private final org.springframework.security.authentication.AuthenticationManager authentication;
  private final TokenService tokens;
  private final Access access;

  public AuthService(
      CustomerRepository users,
      StorageCoordinator coordinator,
      org.springframework.security.crypto.password.PasswordEncoder encoder,
      org.springframework.security.authentication.AuthenticationManager authentication,
      TokenService tokens,
      Access access) {
    this.users = users;
    this.coordinator = coordinator;
    this.encoder = encoder;
    this.authentication = authentication;
    this.tokens = tokens;
    this.access = access;
  }

  public AuthResponse register(RegisterRequest request) {
    return coordinator.locked(
        () -> {
          require(
              users.findByEmail(request.email()).isEmpty(),
              "DUPLICATE_EMAIL",
              "Email is already registered");
          if (request.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("BCrypt password exceeds 72 bytes");
          var user =
              users.save(
                  new Customer(
                      request.fullName(),
                      request.email(),
                      encoder.encode(request.password()),
                      request.phone()));
          return token(user);
        });
  }

  public AuthResponse login(LoginRequest request) {
    authentication.authenticate(
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken
            .unauthenticated(request.email().trim(), request.password()));
    return coordinator.locked(
        () -> {
          User user =
              users
                  .findByEmail(request.email())
                  .orElseThrow(
                      () ->
                          new org.springframework.security.authentication.BadCredentialsException(
                              "Invalid credentials"));
          if (!user.isActive())
            throw new org.springframework.security.authentication.BadCredentialsException(
                "Inactive account");
          return token(user);
        });
  }

  private AuthResponse token(User user) {
    return new AuthResponse(
        tokens.issue(user), "Bearer", tokens.expirationSeconds(), CustomerResponse.from(user));
  }

  public CustomerResponse me() {
    return CustomerResponse.from(access.current());
  }
}
