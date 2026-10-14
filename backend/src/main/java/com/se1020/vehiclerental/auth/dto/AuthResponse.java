package com.se1020.vehiclerental.auth.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    com.se1020.vehiclerental.customer.dto.CustomerResponse user) {}
