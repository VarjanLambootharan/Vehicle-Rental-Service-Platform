package com.se1020.vehiclerental.vehicle;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class VehicleRepository extends TextRepository<Vehicle> {
  public VehicleRepository(TextFileStore store) {
    super(store, "vehicles", Vehicle.class);
  }
}
