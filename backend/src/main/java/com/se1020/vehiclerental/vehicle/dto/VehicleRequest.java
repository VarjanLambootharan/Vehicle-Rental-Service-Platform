package com.se1020.vehiclerental.vehicle.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;

public record VehicleRequest(
    @NotBlank @Pattern(regexp = "CAR|MOTORCYCLE") String type,
    @NotBlank @Size(max = 30) String registrationNumber,
    @NotBlank @Size(max = 80) String brand,
    @NotBlank @Size(max = 80) String model,
    @NotNull @DecimalMin("0.01") @Digits(integer = 9, fraction = 2) BigDecimal dailyRate,
    @NotNull @Size(max = 2000) String description,
    Integer seats,
    @Size(max = 40) String transmission,
    Integer engineCapacityCc) {}
