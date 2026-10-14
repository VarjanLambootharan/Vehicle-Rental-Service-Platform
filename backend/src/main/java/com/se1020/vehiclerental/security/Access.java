package com.se1020.vehiclerental.security;

import com.se1020.vehiclerental.customer.CustomerRepository;
import com.se1020.vehiclerental.customer.Role;
import com.se1020.vehiclerental.customer.User;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class Access {
  private final CustomerRepository users;

  public Access(CustomerRepository users) {
    this.users = users;
  }

  public User current() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser"))
      throw new BadCredentialsException("Authentication required");
    User user;
    try {
      user = users.require(UUID.fromString(auth.getName()));
    } catch (IllegalArgumentException
        | com.se1020.vehiclerental.common.exception.ResourceNotFoundException e) {
      throw new BadCredentialsException("Invalid account");
    }
    if (!user.isActive()) throw new BadCredentialsException("Inactive account");
    return user;
  }

  public boolean isAdmin() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser"))
      return false;
    return current().getRole() == Role.ADMIN;
  }

  public User customer() {
    User u = current();
    if (u.getRole() != Role.CUSTOMER) throw new AccessDeniedException("Customer required");
    return u;
  }

  public void admin() {
    if (current().getRole() != Role.ADMIN)
      throw new AccessDeniedException("Administrator required");
  }

  public void owner(UUID owner) {
    if (!current().getId().equals(owner)) throw new AccessDeniedException("Owner required");
  }

  public void ownerOrAdmin(UUID owner) {
    User u = current();
    if (u.getRole() != Role.ADMIN && !u.getId().equals(owner))
      throw new AccessDeniedException("Owner or administrator required");
  }
}
