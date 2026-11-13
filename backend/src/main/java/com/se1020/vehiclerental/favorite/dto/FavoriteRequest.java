package com.se1020.vehiclerental.favorite.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record FavoriteRequest(@NotNull UUID vehicleId) {}
