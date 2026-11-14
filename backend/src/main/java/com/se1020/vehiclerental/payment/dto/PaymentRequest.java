package com.se1020.vehiclerental.payment.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;

public record PaymentRequest(
    @NotNull UUID bookingId,
    @NotNull com.se1020.vehiclerental.payment.PaymentMethod paymentMethod) {}
