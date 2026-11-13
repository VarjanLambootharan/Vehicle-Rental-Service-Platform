package com.se1020.vehiclerental.vehicleimage;

import static com.se1020.vehiclerental.common.exception.BusinessException.require;

import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.storage.StorageCoordinator;
import com.se1020.vehiclerental.security.Access;
import com.se1020.vehiclerental.vehicle.*;
import com.se1020.vehiclerental.vehicleimage.dto.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class VehicleImageService {
  private static final int MAX_IMAGES = 8;
  private final VehicleImageRepository images;
  private final VehicleRepository vehicles;
  private final StorageCoordinator coordinator;
  private final Access access;

  public VehicleImageService(
      VehicleImageRepository images,
      VehicleRepository vehicles,
      StorageCoordinator coordinator,
      Access access) {
    this.images = images;
    this.vehicles = vehicles;
    this.coordinator = coordinator;
    this.access = access;
  }

  public List<VehicleImageResponse> list(UUID vehicleId) {
    Vehicle vehicle = vehicles.require(vehicleId);
    if (vehicle.getStatus() == VehicleStatus.INACTIVE && !access.isAdmin())
      throw new ResourceNotFoundException("Vehicle");
    return images.findAll().stream()
        .filter(i -> i.getVehicleId().equals(vehicleId))
        .sorted(
            Comparator.comparingInt(VehicleImage::getDisplayOrder)
                .thenComparing(VehicleImage::getCreatedAt))
        .map(VehicleImageResponse::from)
        .toList();
  }

  public VehicleImageResponse create(UUID vehicleId, VehicleImageRequest request) {
    return coordinator.locked(
        () -> {
          access.admin();
          vehicles.require(vehicleId);
          require(
              images.findAll().stream().filter(i -> i.getVehicleId().equals(vehicleId)).count()
                  < MAX_IMAGES,
              "IMAGE_LIMIT",
              "A vehicle can have at most " + MAX_IMAGES + " images");
          return VehicleImageResponse.from(
              images.save(
                  new VehicleImage(
                      vehicleId, request.url(), request.altText(), request.displayOrder())));
        });
  }

  public VehicleImageResponse update(UUID vehicleId, UUID id, VehicleImageRequest request) {
    return coordinator.locked(
        () -> {
          access.admin();
          VehicleImage image = images.require(id);
          require(
              image.getVehicleId().equals(vehicleId),
              "IMAGE_VEHICLE",
              "Image does not belong to this vehicle");
          image.update(request.url(), request.altText(), request.displayOrder());
          return VehicleImageResponse.from(images.save(image));
        });
  }

  public void delete(UUID vehicleId, UUID id) {
    coordinator.locked(
        () -> {
          access.admin();
          require(
              images.require(id).getVehicleId().equals(vehicleId),
              "IMAGE_VEHICLE",
              "Image does not belong to this vehicle");
          images.delete(id);
          return null;
        });
  }
}
