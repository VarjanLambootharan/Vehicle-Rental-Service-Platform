package com.se1020.vehiclerental.auth;

import com.se1020.vehiclerental.auth.dto.AuthResponse;
import com.se1020.vehiclerental.auth.dto.LoginRequest;
import com.se1020.vehiclerental.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService service;

  public AuthController(AuthService service) {
    this.service = service;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    return service.register(request);
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return service.login(request);
  }

  @GetMapping("/me")
  public com.se1020.vehiclerental.customer.dto.CustomerResponse me() {
    return service.me();
  }
}
