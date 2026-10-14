package com.se1020.vehiclerental.auth.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record RegisterRequest(
    @NotBlank @Size(max = 100) String fullName,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 12, max = 72) String password,
    @NotBlank @Pattern(regexp = "[+0-9 ()-]{7,25}") String phone) {}
