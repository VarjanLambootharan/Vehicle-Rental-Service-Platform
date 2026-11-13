package com.se1020.vehiclerental.vehicleimage.dto;

import jakarta.validation.constraints.*;

public record VehicleImageRequest(
    @NotBlank @Pattern(regexp = "https?://[^\\s]{1,2000}") String url,
    @NotBlank @Size(max = 200) String altText,
    @Min(0) @Max(1000) int displayOrder) {}
