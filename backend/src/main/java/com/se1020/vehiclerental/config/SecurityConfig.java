package com.se1020.vehiclerental.config;

import com.se1020.vehiclerental.customer.CustomerRepository;
import com.se1020.vehiclerental.security.CustomUserDetailsService;
import com.se1020.vehiclerental.security.TextBearerFilter;
import com.se1020.vehiclerental.security.TokenService;
import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  public AuthenticationManager authenticationManager(
      CustomUserDetailsService users, PasswordEncoder encoder) {
    var provider = new DaoAuthenticationProvider(users);
    provider.setPasswordEncoder(encoder);
    return new ProviderManager(provider);
  }

  @Bean
  public SecurityFilterChain filterChain(
      HttpSecurity http, CustomerRepository users, TokenService tokens) throws Exception {
    http.csrf(c -> c.disable())
        .cors(c -> {})
        .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    http.authorizeHttpRequests(
        c ->
            c.requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login")
                .permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/reviews/me")
                .authenticated()
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/vehicles",
                    "/api/v1/vehicles/*",
                    "/api/v1/reviews",
                    "/api/v1/reviews/*")
                .permitAll()
                .requestMatchers("/api/v1/**")
                .authenticated()
                .anyRequest()
                .denyAll());
    http.exceptionHandling(
        c ->
            c.authenticationEntryPoint(
                    (req, res, e) ->
                        TextBearerFilter.error(
                            res, 401, "UNAUTHORIZED", "Valid authentication is required"))
                .accessDeniedHandler(
                    (req, res, e) ->
                        TextBearerFilter.error(res, 403, "FORBIDDEN", "Permission denied")));
    http.addFilterBefore(
        new TextBearerFilter(tokens, users),
        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
}
