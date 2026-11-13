package com.se1020.vehiclerental.vehicleimage;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.support.Fixture;
import com.se1020.vehiclerental.vehicleimage.dto.VehicleImageRequest;
import org.junit.jupiter.api.*;

class VehicleImageServiceTest extends Fixture {
  private VehicleImageService service;

  @BeforeEach
  void createService() {
    service = new VehicleImageService(images, vehicles, lock, access);
  }

  private VehicleImageRequest request(int order) {
    return new VehicleImageRequest("https://example.test/" + order + ".png", "Image " + order, order);
  }

  @Test
  void administratorCrudPersistsAndCustomersCannotWrite() {
    as(admin);
    var created = service.create(car.getId(), request(0));

    as(alice);
    assertThat(service.list(car.getId())).extracting(value -> value.id()).containsExactly(created.id());
    assertThatThrownBy(() -> service.create(car.getId(), request(1)))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> service.update(car.getId(), created.id(), request(1)))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> service.delete(car.getId(), created.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

    as(admin);
    var updated =
        service.update(
            car.getId(),
            created.id(),
            new VehicleImageRequest("https://example.test/updated.png", "Updated image", 2));
    assertThat(updated.altText()).isEqualTo("Updated image");
    assertThat(new VehicleImageRepository(store).require(created.id()).getUrl())
        .isEqualTo("https://example.test/updated.png");

    service.delete(car.getId(), created.id());
    assertThat(new VehicleImageRepository(store).findAll()).isEmpty();
  }

  @Test
  void limitsEachVehicleToEightPersistedImages() {
    as(admin);
    for (int order = 0; order < 8; order++) service.create(car.getId(), request(order));

    assertThatThrownBy(() -> service.create(car.getId(), request(8)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("at most 8 images");
    assertThat(new VehicleImageRepository(store).findAll()).hasSize(8);
  }
}
