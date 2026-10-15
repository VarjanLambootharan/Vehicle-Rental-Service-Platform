package com.se1020.vehiclerental.vehicle.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record VehicleStatusRequest(
    @NotNull com.se1020.vehiclerental.vehicle.VehicleStatus status) {}
