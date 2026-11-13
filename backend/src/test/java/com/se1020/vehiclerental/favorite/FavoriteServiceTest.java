package com.se1020.vehiclerental.favorite;

import static org.assertj.core.api.Assertions.*;

import com.se1020.vehiclerental.common.exception.BusinessException;
import com.se1020.vehiclerental.favorite.dto.FavoriteRequest;
import com.se1020.vehiclerental.support.Fixture;
import org.junit.jupiter.api.*;

class FavoriteServiceTest extends Fixture {
  private FavoriteService service;

  @BeforeEach
  void createService() {
    service = new FavoriteService(favorites, vehicles, lock, access);
  }

  @Test
  void addListRemoveEnforcesOwnershipRejectsDuplicatesAndPersists() {
    var added = service.add(new FavoriteRequest(car.getId()));

    assertThat(service.mine()).extracting(value -> value.id()).containsExactly(added.id());
    assertThat(new FavoriteRepository(store).findAll())
        .extracting(Favorite::getId)
        .containsExactly(added.id());
    assertThatThrownBy(() -> service.add(new FavoriteRequest(car.getId())))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("already a favourite");

    as(bob);
    assertThatThrownBy(() -> service.remove(added.id()))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

    as(alice);
    service.remove(added.id());
    assertThat(new FavoriteRepository(store).findAll()).isEmpty();
  }
}
