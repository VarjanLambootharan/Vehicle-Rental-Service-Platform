package com.se1020.vehiclerental.customer.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record ActiveRequest(@NotNull Boolean active) {}
