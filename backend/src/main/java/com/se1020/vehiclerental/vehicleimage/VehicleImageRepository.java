package com.se1020.vehiclerental.vehicleimage;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class VehicleImageRepository extends TextRepository<VehicleImage> {
  public VehicleImageRepository(TextFileStore store) {
    super(store, "vehicle-images", VehicleImage.class);
  }
}
