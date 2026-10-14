package com.se1020.vehiclerental.customer;

public final class Customer extends User {
  private Customer() {}

  public Customer(String name, String email, String hash, String phone) {
    super(name, email, hash, phone);
  }

  @Override
  public Role getRole() {
    return Role.CUSTOMER;
  }

  public void updateProfile(String name, String email, String phone) {
    changeProfile(name, email, phone);
  }

  public void activate() {
    changeActive(true);
  }

  public void deactivate() {
    changeActive(false);
  }
}
