package com.se1020.vehiclerental.payment.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record PaymentStatusRequest(
    @NotNull com.se1020.vehiclerental.payment.PaymentStatus status) {}
