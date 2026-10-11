# Module relationships and viva demonstrations

## Member 1 — Customer and authentication

`AuthController` and `CustomerController` use their services and `CustomerRepository`. `SecurityConfig`, `TokenService`, `CustomUserDetailsService`, `Access` and `AdminInitializer` support authentication. User data is in `users.txt`. Demonstrate register, own-profile GET/PUT, DELETE deactivation, denied cross-customer access and admin reactivation. Show BCrypt in the private store and its absence from the response. Customer deactivation consults protected bookings.

## Member 2 — Vehicle

`VehicleController → VehicleService → VehicleRepository → TextFileStore`. `VehicleCatalogue` aggregates vehicles and applies polymorphic passenger filters. `AvailabilityService` combines vehicle administrative status, bookings and maintenance. Demonstrate creation of both subtypes, search/date filtering, price update and DELETE deactivation. Show that an old booking's snapshot is unaffected by the new rate.

## Member 3 — Booking

`BookingController` uses `BookingService` for creation/date/rental operations and `CancellationService` for DELETE. `RentalPeriod` is composed into Booking. `BookingRepository` writes `bookings.txt`. Show half-open adjacent dates, rejection of overlap, snapshot arithmetic and owner-only changes. For cancellation, explain durable intent, payment settlement and finalization, including why CANCELLATION_PENDING still blocks dates.

## Member 4 — Payment

`PaymentController → PaymentService → PaymentRepository`. Creation reads Booking and copies the amount; the frontend cannot supply it. Demonstrate pending cash, admin PAID/FAILED, DELETE void and backend-configured mock failure. `CancellationService` alone invokes `Payment.settleCancellation`; its workflow ID prevents repeated refunds. Both payment amount and failed/voided history remain stored.

## Member 5 — Maintenance

`MaintenanceController → MaintenanceService → MaintenanceRepository`. The service checks vehicles and bookings and shares the availability lock. Demonstrate future maintenance that permits adjacent bookings, date editing, in-progress completion and cancellation of a scheduled record. Manual vehicle administrative status is independent and never reset automatically by completion.

## Member 6 — Review

`ReviewController → ReviewService → ReviewRepository`. A completed owned booking and matching vehicle are required. Demonstrate create/read/update/delete, 1–5 validation, denied edits by another user, public hiding and failed re-submission after deletion. The retained record keeps the one-review-per-booking rule enforceable.

## Shared notification and persistence flow

Booking, Payment and Review own NotificationEvent values. `NotificationService` scans these repositories and writes deduplicated Notification records. `NotificationController` reads the current user's inbox, marks records read and persists dismissals. `RecoveryRunner` resumes cancellations and event delivery at startup and on a schedule. All repositories use `TextFileStore` and its common reentrant `StorageCoordinator`.

There are no cyclic service dependencies: AvailabilityService uses repositories; NotificationService uses repositories; Booking/Payment/Review/Cancellation services depend on NotificationService. Controllers map validated request DTOs to services and return response DTOs.
