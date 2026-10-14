package com.se1020.vehiclerental.customer;

public final class Admin extends User {
  private Admin() {}

  public Admin(String email, String hash) {
    super("Administrator", email, hash, "");
  }

  @Override
  public Role getRole() {
    return Role.ADMIN;
  }
}
