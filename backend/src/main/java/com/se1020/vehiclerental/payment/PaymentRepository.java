package com.se1020.vehiclerental.payment;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentRepository extends TextRepository<Payment> {
  public PaymentRepository(TextFileStore store) {
    super(store, "payments", Payment.class);
  }
}
