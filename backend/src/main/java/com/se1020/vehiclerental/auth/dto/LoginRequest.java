package com.se1020.vehiclerental.auth.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record LoginRequest(
    @NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {}
