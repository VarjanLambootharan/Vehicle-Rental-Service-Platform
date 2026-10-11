package com.se1020.vehiclerental.review.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record ReviewUpdateRequest(
    @Min(1) @Max(5) int rating, @NotBlank @Size(max = 2000) String comment) {}
