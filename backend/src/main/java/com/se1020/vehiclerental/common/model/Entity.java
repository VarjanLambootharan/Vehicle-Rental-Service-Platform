package com.se1020.vehiclerental.common.model;

import java.time.Instant;
import java.util.UUID;

public abstract class Entity {
  private UUID id = UUID.randomUUID();
  private Instant createdAt = Instant.now();
  private Instant updatedAt = createdAt;

  public UUID getId() {
    return id;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  protected void touch() {
    updatedAt = Instant.now();
  }
}
