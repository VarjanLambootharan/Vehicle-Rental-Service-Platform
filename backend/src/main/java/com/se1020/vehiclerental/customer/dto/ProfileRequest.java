package com.se1020.vehiclerental.customer.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record ProfileRequest(
    @NotBlank @Size(max = 100) String fullName,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Pattern(regexp = "[+0-9 ()-]{7,25}") String phone) {}
