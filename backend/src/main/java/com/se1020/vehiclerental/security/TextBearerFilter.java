package com.se1020.vehiclerental.security;

import com.se1020.vehiclerental.common.response.ApiError;
import com.se1020.vehiclerental.common.storage.StorageException;
import com.se1020.vehiclerental.common.text.*;
import com.se1020.vehiclerental.customer.CustomerRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public final class TextBearerFilter extends OncePerRequestFilter {
  private final TokenService tokens;
  private final CustomerRepository users;

  public TextBearerFilter(TokenService tokens, CustomerRepository users) {
    this.tokens = tokens;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null) {
      try {
        if (!header.regionMatches(true, 0, "Bearer ", 0, 7))
          throw new BadCredentialsException("Invalid bearer header");
        var user = users.require(tokens.verify(header.substring(7)));
        if (!user.isActive()) throw new BadCredentialsException("Inactive account");
        var authentication =
            UsernamePasswordAuthenticationToken.authenticated(
                user.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        SecurityContextHolder.getContext().setAuthentication(authentication);
      } catch (StorageException e) {
        error(response, 503, "STORAGE_UNAVAILABLE", "Account verification is unavailable");
        return;
      } catch (org.springframework.security.core.AuthenticationException
          | IllegalArgumentException
          | com.se1020.vehiclerental.common.exception.ResourceNotFoundException e) {
        SecurityContextHolder.clearContext();
        error(response, 401, "UNAUTHORIZED", "Valid authentication is required");
        return;
      }
    }
    chain.doFilter(request, response);
  }

  public static void error(HttpServletResponse response, int status, String code, String message)
      throws IOException {
    response.setStatus(status);
    response.setContentType("text/plain");
    response.setCharacterEncoding("UTF-8");
    response.getWriter().write(TextCodec.encode(TextMapper.toValue(new ApiError(code, message))));
  }
}
