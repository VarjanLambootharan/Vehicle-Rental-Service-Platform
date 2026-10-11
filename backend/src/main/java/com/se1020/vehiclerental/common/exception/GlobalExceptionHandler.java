package com.se1020.vehiclerental.common.exception;

import com.se1020.vehiclerental.common.response.ApiError;
import com.se1020.vehiclerental.common.storage.StorageException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
  ResponseEntity<ApiError> unsupported(
      org.springframework.web.HttpMediaTypeNotSupportedException e) {
    return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use text/plain with the Traveler text format");
  }

  @ExceptionHandler(BusinessException.class)
  ResponseEntity<ApiError> business(BusinessException e) {
    return error(409, e.getCode(), e.getMessage());
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  ResponseEntity<ApiError> missing(ResourceNotFoundException e) {
    return error(404, "NOT_FOUND", e.getMessage());
  }

  @ExceptionHandler(StorageException.class)
  ResponseEntity<ApiError> storage(StorageException e) {
    return error(503, "STORAGE_UNAVAILABLE", "Persistent storage is unavailable; retry later");
  }

  @ExceptionHandler(AuthenticationException.class)
  ResponseEntity<ApiError> authentication(AuthenticationException e) {
    return error(401, "UNAUTHORIZED", "Valid authentication is required");
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> forbidden(AccessDeniedException e) {
    return error(403, "FORBIDDEN", "You do not have permission for this operation");
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> validation(MethodArgumentNotValidException e) {
    String message =
        e.getBindingResult().getFieldErrors().stream()
            .map(x -> x.getField() + ": " + x.getDefaultMessage())
            .sorted()
            .distinct()
            .collect(java.util.stream.Collectors.joining("; "));
    return error(400, "VALIDATION_ERROR", message);
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
    ConstraintViolationException.class,
    IllegalArgumentException.class
  })
  ResponseEntity<ApiError> invalid(Exception e) {
    return error(
        400, "INVALID_REQUEST", "Invalid request fields, dates, identifiers, or text body");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> unexpected(Exception e) {
    LoggerFactory.getLogger(getClass())
        .error("Unexpected request failure ({})", e.getClass().getSimpleName());
    return error(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }

  private ResponseEntity<ApiError> error(int status, String code, String message) {
    return ResponseEntity.status(status).body(new ApiError(code, message));
  }
}
