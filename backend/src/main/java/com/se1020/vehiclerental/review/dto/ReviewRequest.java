package com.se1020.vehiclerental.review.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public record ReviewRequest(
    @NotNull UUID bookingId,
    @NotNull UUID vehicleId,
    @Min(1) @Max(5) int rating,
    @NotBlank @Size(max = 2000) String comment) {}
