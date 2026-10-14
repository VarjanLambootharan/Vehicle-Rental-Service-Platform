package com.se1020.vehiclerental.customer;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class CustomerRepository extends TextRepository<User> {
  public CustomerRepository(TextFileStore store) {
    super(store, "users", User.class);
  }

  public java.util.Optional<User> findByEmail(String email) {
    return findAll().stream().filter(u -> u.getEmail().equalsIgnoreCase(email.trim())).findFirst();
  }
}
