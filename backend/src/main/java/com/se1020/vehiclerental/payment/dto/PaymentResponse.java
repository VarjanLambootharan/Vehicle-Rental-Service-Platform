package com.se1020.vehiclerental.payment.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID bookingId,
    UUID customerId,
    BigDecimal amount,
    String currency,
    com.se1020.vehiclerental.payment.PaymentMethod paymentMethod,
    com.se1020.vehiclerental.payment.PaymentStatus status,
    Instant createdAt,
    Instant updatedAt,
    Instant refundedAt,
    String simulatedRefundReference) {
  public static PaymentResponse from(com.se1020.vehiclerental.payment.Payment p) {
    return new PaymentResponse(
        p.getId(),
        p.getBookingId(),
        p.getCustomerId(),
        p.getAmount(),
        "LKR",
        p.getPaymentMethod(),
        p.getStatus(),
        p.getCreatedAt(),
        p.getUpdatedAt(),
        p.getRefundedAt(),
        p.getSimulatedRefundReference());
  }
}
