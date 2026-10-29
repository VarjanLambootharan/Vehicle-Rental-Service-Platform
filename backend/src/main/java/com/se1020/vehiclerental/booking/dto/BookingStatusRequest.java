package com.se1020.vehiclerental.booking.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record BookingStatusRequest(
    @NotNull com.se1020.vehiclerental.booking.BookingStatus status) {}
