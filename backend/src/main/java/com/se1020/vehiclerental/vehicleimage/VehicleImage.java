package com.se1020.vehiclerental.vehicleimage;

import com.se1020.vehiclerental.common.model.Entity;
import java.util.UUID;

public final class VehicleImage extends Entity {
  private UUID vehicleId;
  private String url;
  private String altText;
  private int displayOrder;

  private VehicleImage() {}

  public VehicleImage(UUID vehicleId, String url, String altText, int displayOrder) {
    this.vehicleId = vehicleId;
    update(url, altText, displayOrder);
  }

  public void update(String url, String altText, int displayOrder) {
    if (url == null || !url.matches("https?://[^\\s]{1,2000}"))
      throw new IllegalArgumentException("Image URL must be a valid http or https URL");
    if (altText == null || altText.isBlank() || altText.length() > 200)
      throw new IllegalArgumentException("Image alt text must be 1–200 characters");
    if (displayOrder < 0 || displayOrder > 1000)
      throw new IllegalArgumentException("Image display order must be 0–1000");
    this.url = url.trim();
    this.altText = altText.trim();
    this.displayOrder = displayOrder;
    touch();
  }

  public UUID getVehicleId() {
    return vehicleId;
  }

  public String getUrl() {
    return url;
  }

  public String getAltText() {
    return altText;
  }

  public int getDisplayOrder() {
    return displayOrder;
  }
}
