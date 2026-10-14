package com.se1020.vehiclerental.security;

import com.se1020.vehiclerental.customer.User;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Signed text tokens: t1.UUID.issuedSeconds.expirySeconds.randomNonce.signature. No JSON. */
@Service
public class TokenService {
  private final byte[] key;
  private final long expiration;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();

  public TokenService(
      @Value("${app.token.secret}") String secret,
      @Value("${app.token.expiration}") long expiration,
      Clock clock) {
    try {
      key = Base64.getDecoder().decode(secret);
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException("TOKEN_SECRET must be Base64 random bytes");
    }
    if (key.length < 32)
      throw new IllegalStateException("TOKEN_SECRET needs at least 32 random bytes");
    if (expiration < 60 || expiration > 86400)
      throw new IllegalStateException("TOKEN_EXPIRATION must be 60–86400 seconds");
    this.expiration = expiration;
    this.clock = clock;
  }

  public String issue(User user) {
    long now = clock.instant().getEpochSecond();
    byte[] nonce = new byte[24];
    random.nextBytes(nonce);
    String payload =
        "t1." + user.getId() + "." + now + "." + (now + expiration) + "." + encode(nonce);
    return payload + "." + encode(sign(payload));
  }

  public UUID verify(String token) {
    try {
      if (token.length() > 512) throw new IllegalArgumentException();
      String[] parts = token.split("\\.", -1);
      if (parts.length != 6 || !parts[0].equals("t1")) throw new IllegalArgumentException();
      String payload = token.substring(0, token.lastIndexOf('.'));
      if (!MessageDigest.isEqual(sign(payload), Base64.getUrlDecoder().decode(parts[5])))
        throw new IllegalArgumentException();
      long issued = Long.parseLong(parts[2]), expires = Long.parseLong(parts[3]);
      long now = clock.instant().getEpochSecond();
      if (issued > now + 30
          || expires <= now
          || expires <= issued
          || expires - issued > 86400
          || Base64.getUrlDecoder().decode(parts[4]).length != 24)
        throw new IllegalArgumentException();
      return UUID.fromString(parts[1]);
    } catch (IllegalArgumentException e) {
      throw new org.springframework.security.authentication.BadCredentialsException(
          "Invalid or expired token");
    }
  }

  public long expirationSeconds() {
    return expiration;
  }

  private static String encode(byte[] bytes) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private byte[] sign(String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      return mac.doFinal(("vehicle-rental|" + payload).getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException("Signing unavailable", e);
    }
  }
}
