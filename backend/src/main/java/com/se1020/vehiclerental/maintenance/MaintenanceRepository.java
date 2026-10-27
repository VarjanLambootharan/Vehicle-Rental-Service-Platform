package com.se1020.vehiclerental.maintenance;

import com.se1020.vehiclerental.common.storage.TextFileStore;
import com.se1020.vehiclerental.common.storage.TextRepository;
import org.springframework.stereotype.Repository;

@Repository
public class MaintenanceRepository extends TextRepository<MaintenanceRecord> {
  public MaintenanceRepository(TextFileStore store) {
    super(store, "maintenance", MaintenanceRecord.class);
  }
}
