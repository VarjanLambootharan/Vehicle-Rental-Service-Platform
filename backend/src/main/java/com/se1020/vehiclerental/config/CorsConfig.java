package com.se1020.vehiclerental.config;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.cors.*;

@Configuration
public class CorsConfig {
  @Bean
  public CorsConfigurationSource corsConfigurationSource(
      @Value("${app.frontend.origin}") String origins) {
    var config = new CorsConfiguration();
    var allowed =
        Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    if (allowed.isEmpty() || allowed.contains("*"))
      throw new IllegalStateException("Configure explicit FRONTEND_ORIGIN values");
    config.setAllowedOrigins(allowed);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(false);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
