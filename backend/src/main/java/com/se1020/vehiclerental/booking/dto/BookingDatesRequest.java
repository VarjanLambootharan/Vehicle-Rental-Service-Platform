package com.se1020.vehiclerental.booking.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record BookingDatesRequest(@NotNull LocalDate pickupDate, @NotNull LocalDate returnDate) {}
