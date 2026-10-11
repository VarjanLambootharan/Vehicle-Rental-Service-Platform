# Implemented class responsibilities

Each module has its own controller, service, repository, model, request DTOs and response DTOs. This inventory follows the actual source tree.

## VehicleRentalApplication.java

- `VehicleRentalApplication.java` — Spring Boot entry point and scheduling activation.

## auth

- `auth/AuthController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `auth/AuthService.java` — Registers customers and authenticates logins, returning safe token/profile DTOs.
- `auth/dto/AuthResponse.java` — Explicit response projection excluding private persistence fields.
- `auth/dto/LoginRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `auth/dto/RegisterRequest.java` — Explicit validated request contract; exposes only permitted inputs.

## booking

- `booking/Booking.java` — Owns rental period, rate/total, booking status, workflow and source events.
- `booking/BookingController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `booking/BookingRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `booking/BookingService.java` — Validated reservations, owned date changes and administrative rental transitions.
- `booking/BookingStatus.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.
- `booking/CancellationService.java` — Durably records, resumes and finalizes cancellation with idempotent payment settlement.
- `booking/CancellationWorkflow.java` — Persisted workflow identity, payment action, original payment reference/amount and progress.
- `booking/dto/BookingDatesRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `booking/dto/BookingRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `booking/dto/BookingResponse.java` — Explicit response projection excluding private persistence fields.
- `booking/dto/BookingStatusRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `booking/RentalPeriod.java` — Valid half-open date value with day count, overlap and date membership.

## common

- `common/exception/BusinessException.java` — Stable business conflict code and readable message.
- `common/exception/GlobalExceptionHandler.java` — Maps validation, security, state and persistence errors to structured HTTP responses.
- `common/exception/ResourceNotFoundException.java` — Missing resource signal.
- `common/model/Entity.java` — Backend-generated UUID and UTC creation/update timestamps.
- `common/model/EventEntity.java` — Owns persistent notification events and exposes immutable copies.
- `common/response/ApiError.java` — Stable code/message/timestamp error DTO.
- `common/storage/FileStorageConfig.java` — Provides a Clock in the configured business timezone.
- `common/storage/TextFileStore.java` — Typed plain-text IO, shape checks, atomic replacement, temporary files and retained backups.
- `common/storage/TextRepository.java` — Generic repository read/find/save operations over one typed file.
- `common/storage/StorageCoordinator.java` — One fair reentrant lock for read-modify-write and cross-module invariants.
- `common/storage/StorageException.java` — Signals persistence failure without claiming a committed operation.

## config

- `config/AdminInitializer.java` — Seeds a configured admin into an empty user store, without resetting existing accounts.
- `config/CorsConfig.java` — Restricts browser cross-origin requests to configured explicit origins.
- `config/RecoveryRunner.java` — Validates typed stores at startup and retries cancellation/event recovery.
- `config/SecurityConfig.java` — BCrypt, authentication provider, signed-text bearer verification, stateless security and current-account bearer checks.

## customer

- `customer/Admin.java` — Administrative role; no public administrative registration.
- `customer/Customer.java` — Customer role and controlled profile/reactivation/deactivation methods.
- `customer/CustomerController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `customer/CustomerRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `customer/CustomerService.java` — Profile updates, administrative search and guarded account deactivation.
- `customer/dto/ActiveRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `customer/dto/CustomerResponse.java` — Explicit response projection excluding private persistence fields.
- `customer/dto/ProfileRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `customer/Role.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.
- `customer/User.java` — Abstract private account fields and common protected profile/active behavior.

## maintenance

- `maintenance/dto/MaintenanceRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `maintenance/dto/MaintenanceResponse.java` — Explicit response projection excluding private persistence fields.
- `maintenance/dto/MaintenanceUpdateRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `maintenance/MaintenanceController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `maintenance/MaintenanceRecord.java` — Vehicle service interval, cost and controlled maintenance transitions.
- `maintenance/MaintenanceRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `maintenance/MaintenanceService.java` — Schedules, checks and updates maintenance without implicitly changing vehicle status.
- `maintenance/MaintenanceStatus.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.

## notification

- `notification/dto/NotificationResponse.java` — Explicit response projection excluding private persistence fields.
- `notification/dto/UnreadCountResponse.java` — Explicit response projection excluding private persistence fields.
- `notification/Notification.java` — Delivered event identity, recipient, read status and dismissal tombstone.
- `notification/NotificationController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `notification/NotificationEvent.java` — Immutable event payload stored with its originating business state.
- `notification/NotificationRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `notification/NotificationService.java` — Durable event delivery/deduplication plus owner inbox/read/dismiss operations.
- `notification/NotificationType.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.

## payment

- `payment/dto/PaymentRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `payment/dto/PaymentResponse.java` — Explicit response projection excluding private persistence fields.
- `payment/dto/PaymentStatusRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `payment/Payment.java` — Server-controlled attempt amount/status and idempotent workflow refund/void methods.
- `payment/PaymentController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `payment/PaymentMethod.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.
- `payment/PaymentRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `payment/PaymentService.java` — Owned payment attempts and administrative pending-state changes.
- `payment/PaymentStatus.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.

## review

- `review/dto/ReviewRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `review/dto/ReviewResponse.java` — Explicit response projection excluding private persistence fields.
- `review/dto/ReviewUpdateRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `review/Review.java` — Completed-booking feedback, rating validation, edits and soft deletion.
- `review/ReviewController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `review/ReviewRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `review/ReviewService.java` — Completed-rental eligibility, ownership, uniqueness and review CRUD.

## security

- `security/Access.java` — Resolves current active user and checks customer/admin/owner permissions.
- `security/CustomUserDetailsService.java` — Loads current stored credentials for Spring authentication.
- `security/TokenService.java` — Issues signed tokens with subject, issued-at, expiry and random nonce with an application-specific signature prefix.

## vehicle

- `vehicle/AvailabilityService.java` — Checks combined vehicle, protected booking and maintenance availability.
- `vehicle/Car.java` — Seat count, transmission and overridden capacity/rental guidance.
- `vehicle/dto/VehicleRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `vehicle/dto/VehicleResponse.java` — Explicit response projection excluding private persistence fields.
- `vehicle/dto/VehicleStatusRequest.java` — Explicit validated request contract; exposes only permitted inputs.
- `vehicle/Motorcycle.java` — Engine capacity and overridden capacity/rental guidance.
- `vehicle/Vehicle.java` — Abstract registration, pricing, administrative status and subtype behavior contract.
- `vehicle/VehicleCatalogue.java` — Independent-vehicle grouping with search/type/passenger filtering.
- `vehicle/VehicleController.java` — REST routing, Jakarta validation, role annotations and HTTP response conventions for this module.
- `vehicle/VehicleRepository.java` — Domain-typed TextRepository implementation; all permanent data passes through TextFileStore.
- `vehicle/VehicleService.java` — Catalogue queries, subtype creation, guarded details/status changes.
- `vehicle/VehicleStatus.java` — Enumerates supported domain values; rejects arbitrary string states during text binding.

## Text conversion support

- `common/text/TextCodec.java` — validates and reads/writes the versioned escaped line format through buffered character streams.
- `common/text/TextMapper.java` — maps private domain fields and record DTOs to/from text values; checks field names, storage completeness, types and explicit subtype tags. Reflection is confined to this adapter.
- `common/storage/TextStorageVerifier.java` — read-only offline typed validation and complete field equality checks.
- `config/TextHttpConfig.java` — text/plain message converter for existing controller DTOs, preserving Jakarta validation.
- `security/TextBearerFilter.java` — verifies signed text tokens and reloads the current user/role; produces text security errors.
