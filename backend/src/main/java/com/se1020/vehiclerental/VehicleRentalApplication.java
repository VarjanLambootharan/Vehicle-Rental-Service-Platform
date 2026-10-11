package com.se1020.vehiclerental;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VehicleRentalApplication {
  public static void main(String[] args) {
    SpringApplication.run(VehicleRentalApplication.class, args);
  }
}
