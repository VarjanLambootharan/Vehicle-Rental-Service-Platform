package com.se1020.vehiclerental.common.storage;

import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

@Configuration
public class FileStorageConfig {
  @Bean
  public Clock businessClock(@Value("${app.business.timezone}") String zone) {
    return Clock.system(ZoneId.of(zone));
  }
}
