package com.se1020.vehiclerental.common.storage;

import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/** One reentrant lock serializes validation and writes across all seven files. */
@Component
public class StorageCoordinator {
  private final ReentrantLock lock = new ReentrantLock(true);

  public <T> T locked(Supplier<T> action) {
    lock.lock();
    try {
      return action.get();
    } finally {
      lock.unlock();
    }
  }

  public void locked(Runnable action) {
    locked(
        () -> {
          action.run();
          return null;
        });
  }
}
