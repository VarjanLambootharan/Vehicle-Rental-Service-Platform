package com.se1020.vehiclerental.customer;

import com.se1020.vehiclerental.common.model.Entity;

public abstract class User extends Entity {
  private String fullName, email, passwordHash, phone;
  private boolean active = true;

  protected User() {}

  protected User(String fullName, String email, String passwordHash, String phone) {
    this.fullName = fullName.trim();
    this.email = email.trim().toLowerCase(java.util.Locale.ROOT);
    this.passwordHash = passwordHash;
    this.phone = phone;
  }

  public abstract Role getRole();

  public String getFullName() {
    return fullName;
  }

  public String getEmail() {
    return email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public String getPhone() {
    return phone;
  }

  public boolean isActive() {
    return active;
  }

  protected void changeProfile(String fullName, String email, String phone) {
    this.fullName = fullName.trim();
    this.email = email.trim().toLowerCase(java.util.Locale.ROOT);
    this.phone = phone;
    touch();
  }

  protected void changeActive(boolean active) {
    this.active = active;
    touch();
  }
}
