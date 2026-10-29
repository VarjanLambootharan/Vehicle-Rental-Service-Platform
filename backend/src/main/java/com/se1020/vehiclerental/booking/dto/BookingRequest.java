package com.se1020.vehiclerental.booking.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public record BookingRequest(
    @NotNull UUID vehicleId, @NotNull LocalDate pickupDate, @NotNull LocalDate returnDate) {}
