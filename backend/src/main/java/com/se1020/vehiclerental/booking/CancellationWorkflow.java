package com.se1020.vehiclerental.booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class CancellationWorkflow {
  public enum PaymentAction {
    NONE,
    VOID,
    REFUND
  }

  public enum State {
    REQUESTED,
    COMPLETED
  }

  private UUID workflowId = UUID.randomUUID(), bookingId, originalPaymentId;
  private PaymentAction requiredPaymentAction;
  private BigDecimal originalPaymentAmount;
  private Instant requestedAt = Instant.now();
  private State state = State.REQUESTED;

  private CancellationWorkflow() {}

  public CancellationWorkflow(
      UUID bookingId, UUID paymentId, PaymentAction action, BigDecimal amount) {
    this.bookingId = bookingId;
    originalPaymentId = paymentId;
    requiredPaymentAction = action;
    originalPaymentAmount = amount;
  }

  void complete() {
    state = State.COMPLETED;
  }

  public UUID getWorkflowId() {
    return workflowId;
  }

  public UUID getBookingId() {
    return bookingId;
  }

  public UUID getOriginalPaymentId() {
    return originalPaymentId;
  }

  public PaymentAction getRequiredPaymentAction() {
    return requiredPaymentAction;
  }

  public BigDecimal getOriginalPaymentAmount() {
    return originalPaymentAmount;
  }

  public Instant getRequestedAt() {
    return requestedAt;
  }

  public State getState() {
    return state;
  }
}
