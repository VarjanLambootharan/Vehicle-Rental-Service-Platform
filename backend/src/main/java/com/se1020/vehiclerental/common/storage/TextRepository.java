package com.se1020.vehiclerental.common.storage;

import com.se1020.vehiclerental.common.exception.ResourceNotFoundException;
import com.se1020.vehiclerental.common.model.Entity;
import java.util.*;

public abstract class TextRepository<T extends Entity> {
  private final TextFileStore store;
  private final String file;
  private final Class<T> type;

  protected TextRepository(TextFileStore store, String file, Class<T> type) {
    this.store = store;
    this.file = file;
    this.type = type;
  }

  public List<T> findAll() {
    return store.read(file, type);
  }

  public T require(UUID id) {
    return findAll().stream()
        .filter(e -> e.getId().equals(id))
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException(file));
  }

  public T save(T entity) {
    store.update(
        file,
        type,
        list -> {
          list.removeIf(e -> e.getId().equals(entity.getId()));
          list.add(entity);
          return list;
        });
    return entity;
  }
}
