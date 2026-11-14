package com.se1020.vehiclerental.payment;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.common.model.EventEntity;
import com.se1020.vehiclerental.notification.NotificationType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class Payment extends EventEntity {
  private UUID bookingId, customerId, processedWorkflowId;
  private BigDecimal amount;
  private PaymentMethod paymentMethod;
  private PaymentStatus status;
  private Instant refundedAt;
  private String simulatedRefundReference;

  private Payment() {}

  public Payment(
      UUID bookingId,
      UUID customerId,
      BigDecimal amount,
      PaymentMethod method,
      boolean mockSuccess) {
    this.bookingId = bookingId;
    this.customerId = customerId;
    this.amount = amount;
    paymentMethod = method;
    status =
        method == PaymentMethod.CASH_ON_PICKUP
            ? PaymentStatus.PENDING
            : (mockSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED);
    paymentEvent();
  }

  private void paymentEvent() {
    switch (status) {
      case PENDING ->
          recordEvent(
              customerId,
              NotificationType.PAYMENT_RECORDED,
              "Payment Recorded",
              "Your cash-on-pickup payment is pending. No payment has been received.");
      case PAID ->
          recordEvent(
              customerId,
              NotificationType.PAYMENT_PAID,
              "Payment Paid",
              "LKR " + amount.toPlainString() + " recorded as paid (simulation only).");
      case FAILED ->
          recordEvent(
              customerId,
              NotificationType.PAYMENT_FAILED,
              "Payment Failed",
              "The simulated payment failed. You may try again.");
      default -> {}
    }
  }

  public boolean current() {
    return status == PaymentStatus.PENDING || status == PaymentStatus.PAID;
  }

  public void transitionPending(PaymentStatus next) {
    require(
        status == PaymentStatus.PENDING
            && (next == PaymentStatus.PAID
                || next == PaymentStatus.FAILED
                || next == PaymentStatus.VOIDED),
        "PAYMENT_STATE",
        "Only pending payments may be paid, failed, or voided");
    status = next;
    touch();
    paymentEvent();
  }

  public void settleCancellation(UUID workflowId, boolean refund) {
    PaymentStatus target = refund ? PaymentStatus.REFUNDED : PaymentStatus.VOIDED;
    if (workflowId.equals(processedWorkflowId) && status == target) return;
    require(
        processedWorkflowId == null
            && status == (refund ? PaymentStatus.PAID : PaymentStatus.PENDING),
        "PAYMENT_STATE",
        "Payment cannot be settled by this workflow");
    processedWorkflowId = workflowId;
    status = target;
    if (refund) {
      refundedAt = Instant.now();
      simulatedRefundReference = "SIM-" + workflowId;
    }
    touch();
  }

  public UUID getBookingId() {
    return bookingId;
  }

  public UUID getCustomerId() {
    return customerId;
  }

  public UUID getProcessedWorkflowId() {
    return processedWorkflowId;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public PaymentMethod getPaymentMethod() {
    return paymentMethod;
  }

  public PaymentStatus getStatus() {
    return status;
  }

  public Instant getRefundedAt() {
    return refundedAt;
  }

  public String getSimulatedRefundReference() {
    return simulatedRefundReference;
  }
}
