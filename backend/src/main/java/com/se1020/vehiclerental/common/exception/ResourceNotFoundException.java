package com.se1020.vehiclerental.common.exception;

public class ResourceNotFoundException extends RuntimeException {
  public ResourceNotFoundException(String resource) {
    super(resource + " not found");
  }
}
