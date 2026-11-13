package com.se1020.vehiclerental.favorite;

import com.se1020.vehiclerental.common.storage.*;
import org.springframework.stereotype.Repository;

@Repository
public class FavoriteRepository extends TextRepository<Favorite> {
  public FavoriteRepository(TextFileStore store) {
    super(store, "favorites", Favorite.class);
  }
}
