package com.se1020.vehiclerental.notification.dto;

import jakarta.validation.constraints.*;
import java.time.*;

public record UnreadCountResponse(long count) {}
