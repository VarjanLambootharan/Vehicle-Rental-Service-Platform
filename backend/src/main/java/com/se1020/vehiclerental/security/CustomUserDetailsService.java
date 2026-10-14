package com.se1020.vehiclerental.security;

import com.se1020.vehiclerental.customer.CustomerRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
  private final CustomerRepository users;

  public CustomUserDetailsService(CustomerRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String email) {
    var u =
        users
            .findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    return User.withUsername(u.getEmail())
        .password(u.getPasswordHash())
        .roles(u.getRole().name())
        .disabled(!u.isActive())
        .build();
  }
}
