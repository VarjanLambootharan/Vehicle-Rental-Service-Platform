package com.se1020.vehiclerental.favorite;

import com.se1020.vehiclerental.favorite.dto.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/favorites")
public class FavoriteController {
  private final FavoriteService service;

  public FavoriteController(FavoriteService service) {
    this.service = service;
  }

  @GetMapping
  public List<FavoriteResponse> mine() {
    return service.mine();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public FavoriteResponse add(@Valid @RequestBody FavoriteRequest request) {
    return service.add(request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@PathVariable UUID id) {
    service.remove(id);
  }
}
