package com.se1020.vehiclerental.maintenance.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;

public record MaintenanceUpdateRequest(
    @NotBlank @Size(max = 2000) String description,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotNull @DecimalMin("0.00") @Digits(integer = 9, fraction = 2) BigDecimal cost,
    @NotNull com.se1020.vehiclerental.maintenance.MaintenanceStatus status) {}
