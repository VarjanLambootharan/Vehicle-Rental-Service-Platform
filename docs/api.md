# REST API reference

Base URL: `http://localhost:8080/api/v1`. Versioned plain-text request and response bodies (`Content-Type: text/plain; charset=utf-8`, `Accept: text/plain`). See [the format and viva guide](no-json/implementation-and-viva.md). Dates are `YYYY-MM-DD`; timestamps are ISO-8601 UTC instants. IDs are UUID strings. Money uses a `number` line represented by Java BigDecimal; booking/payment currency is LKR. Rental and maintenance intervals are half-open: `[pickupDate, returnDate)` and `[startDate, endDate)`.

Protected requests require `Authorization: Bearer <accessToken>`. Ownership is derived from the token and verified against current stored accounts. Unknown request fields are rejected, including client-supplied role, amount or payment status on creation. Lists return arrays; there is no pagination in this university-scale backend. Public vehicle results exclude INACTIVE vehicles; admins can see them. Public reviews exclude deleted records; authenticated admins can inspect them through the same review GET endpoints.

## Authentication and customers — Member 1

- `POST /auth/register` — public; 201 AuthResponse. Body: `fullName`, `email`, `password`, `phone`. Role is always CUSTOMER.
- `POST /auth/login` — public; 200 AuthResponse. Body: `email`, `password`.
- `GET /auth/me` — authenticated; 200 CustomerResponse, including role for either account type.
- `GET /customers/me` — CUSTOMER; 200 CustomerResponse.
- `PUT /customers/me` — CUSTOMER; 200 CustomerResponse. Body: `fullName`, `email`, `phone`.
- `DELETE /customers/me` — CUSTOMER; 204. Deactivates if no protected bookings remain.
- `GET /customers?q=alice` — ADMIN; customer response array, case-insensitive name/email search.
- `GET /customers/{id}` — ADMIN; 200 CustomerResponse.
- `PATCH /customers/{id}/active` — ADMIN; 200 CustomerResponse. Body: `active=true` or false. Deactivation applies the same booking guard.

Names are required and at most 100 characters. Email is required, syntactically validated, at most 254 characters and unique without case sensitivity. Passwords are 12–72 characters and at most 72 UTF-8 bytes. Phone permits 7–25 characters consisting of digits, spaces, parentheses, `+` and `-`.

```text
TRAVELER-TEXT-1
object	4
key	fullName
string	Example Customer
key	email
string	customer@example.com
key	password
string	<your-private-password>
key	phone
string	0771234567
```

AuthResponse fields: `accessToken`, `tokenType` (Bearer), `expiresIn` (seconds), `user` (CustomerResponse). CustomerResponse: `id`, `fullName`, `email`, `phone`, `role`, `active`, `createdAt`, `updatedAt`. Passwords and hashes are never returned.

## Vehicles — Member 2

- `GET /vehicles` — public; VehicleResponse array. Optional query parameters: `q`, `type` (CAR or MOTORCYCLE), `minimumPassengers`, `pickupDate`, `returnDate`. Supply both dates to filter actual availability.
- `GET /vehicles/{id}` — public; 200 VehicleResponse (inactive records require ADMIN).
- `POST /vehicles` — ADMIN; 201 VehicleResponse. Body: VehicleRequest below.
- `PUT /vehicles/{id}` — ADMIN; 200 VehicleResponse. Same complete VehicleRequest; type is immutable.
- `PATCH /vehicles/{id}/status` — ADMIN; 200 VehicleResponse. Body: `status=AVAILABLE`, IN_MAINTENANCE, or INACTIVE.
- `DELETE /vehicles/{id}` — ADMIN; 204. Sets INACTIVE; rejects unresolved protected bookings.

```text
TRAVELER-TEXT-1
object	8
key	type
string	CAR
key	registrationNumber
string	ABC-1234
key	brand
string	Toyota
key	model
string	Aqua
key	dailyRate
number	7500.0
key	description
string	Compact hybrid
key	seats
number	5
key	transmission
string	AUTOMATIC
```

```text
TRAVELER-TEXT-1
object	7
key	type
string	MOTORCYCLE
key	registrationNumber
string	BIKE-1234
key	brand
string	Honda
key	model
string	CB150
key	dailyRate
number	3000.0
key	description
string	Road motorcycle
key	engineCapacityCc
number	150
```

Rate must be positive with at most 9 integer and 2 fractional digits. Registration is required, at most 30 characters and unique without case sensitivity. Brand/model max 80 characters, description max 2000. Cars need 2–9 seats and transmission; motorcycles need 50–2500 cc. VehicleResponse includes request fields plus `id`, `status`, `passengerCapacity`, subtype-specific `rentalGuidance`, `createdAt`, `updatedAt`. Irrelevant subtype fields are null.

Price and description changes may coexist with bookings, because stored booking prices remain unchanged. Changes to registration, brand, model, seating/transmission or engine capacity are rejected while protected bookings remain. AVAILABLE is an administrative status; date availability also considers bookings and maintenance.

## Bookings — Member 3

- `POST /bookings` — CUSTOMER; 201 BookingResponse. Body: `vehicleId`, `pickupDate`, `returnDate`. New state is CONFIRMED.
- `GET /bookings/me` — CUSTOMER; own BookingResponse array.
- `GET /bookings/{id}` — OWNER/ADMIN; 200 BookingResponse.
- `PUT /bookings/{id}` — OWNER customer; 200 BookingResponse. Body: `pickupDate`, `returnDate`. Requires a future CONFIRMED booking without PENDING/PAID payment.
- `DELETE /bookings/{id}` — OWNER/ADMIN; 200 CANCELLED BookingResponse, or 202 CANCELLATION_PENDING BookingResponse. Repeat safely to resume. Never physically deletes the record.
- `GET /bookings` — ADMIN; all BookingResponse records.
- `PATCH /bookings/{id}/status` — ADMIN; 200 BookingResponse. Body: `status=ACTIVE` or COMPLETED.

```text
TRAVELER-TEXT-1
object	3
key	vehicleId
string	<vehicle-uuid>
key	pickupDate
string	2030-01-12
key	returnDate
string	2030-01-14
```

Pickup must not be in the past and return must be later. Adjacent bookings are permitted. CONFIRMED, ACTIVE and CANCELLATION_PENDING records block overlapping intervals. A current IN_PROGRESS maintenance record blocks all new reservations; scheduled maintenance blocks its interval. Starting requires a PAID payment and today's business date inside the rental interval. Only ACTIVE can become COMPLETED. Cancellation requires CONFIRMED and a pickup strictly after today.

BookingResponse fields: `id`, `customerId`, `vehicleId`, `rentalPeriod` (`pickupDate`, `returnDate`), `dailyRateSnapshot`, `totalAmount`, `currency`, `status`, `createdAt`, `updatedAt`, `cancelledAt`, `cancellationWorkflowId`. Total is saved rate times rental days. Internal events and workflow implementation details are not returned. The workflow ID is null before cancellation.

## Payments — Member 4

- `POST /payments` — CUSTOMER; 201 PaymentResponse. Body: `bookingId`, `paymentMethod` (CASH_ON_PICKUP or MOCK_ONLINE).
- `GET /payments/me` — CUSTOMER; own PaymentResponse array.
- `GET /payments/{id}` — OWNER/ADMIN; 200 PaymentResponse.
- `GET /payments` — ADMIN; all PaymentResponse records.
- `PATCH /payments/{id}/status` — ADMIN; 200 PaymentResponse. Body: `status=PAID`, FAILED or VOIDED; only transitions from PENDING are allowed, with a CONFIRMED booking.
- `DELETE /payments/{id}` — ADMIN; 204. Voids an eligible PENDING payment.

```text
TRAVELER-TEXT-1
object	2
key	bookingId
string	<booking-uuid>
key	paymentMethod
string	MOCK_ONLINE
```

Server sets identity, amount and result. CASH_ON_PICKUP creates PENDING. MOCK_ONLINE creates PAID by default, or FAILED with backend `MOCK_PAYMENT_SUCCESS=false`. There may be historical failed/voided attempts, but no more than one current pending/paid attempt. A refund is possible only through booking cancellation. No card number, CVV or bank credential fields exist.

PaymentResponse: `id`, `bookingId`, `customerId`, `amount`, `currency`, `paymentMethod`, `status`, `createdAt`, `updatedAt`, `refundedAt`, `simulatedRefundReference`. The last two fields are null until a simulated refund. No real money is processed.

## Maintenance — Member 5

All routes require ADMIN.

- `GET /maintenance` — MaintenanceResponse array; optional `q` (description search), `vehicleId`.
- `GET /maintenance/{id}` — 200 MaintenanceResponse.
- `POST /maintenance` — 201 MaintenanceResponse; body below. New state SCHEDULED.
- `PUT /maintenance/{id}` — 200 MaintenanceResponse; full body with `description`, `startDate`, `endDate`, `cost`, `status`. Vehicle is immutable and omitted from update requests.
- `DELETE /maintenance/{id}` — 204. Cancels only SCHEDULED records.

```text
TRAVELER-TEXT-1
object	5
key	vehicleId
string	<vehicle-uuid>
key	description
string	Scheduled service
key	startDate
string	2030-01-20
key	endDate
string	2030-01-22
key	cost
number	5000.0
```

Cost is nonnegative, at most 9 integer and 2 fractional digits. Description is required, max 2000. Creation/date changes cannot start in the past. Conflicts with other maintenance or protected bookings are rejected. Details can change only while SCHEDULED. Allowed transitions: SCHEDULED → IN_PROGRESS/CANCELLED and IN_PROGRESS → COMPLETED. To transition without editing details, send existing details with the new status. Starting requires today in the scheduled interval and no unresolved protected rental commitments. An ACTIVE rental also prevents scheduling maintenance, even if its nominal return date has passed.

Maintenance does not automatically change `Vehicle.status`. Any manually applied IN_MAINTENANCE restriction persists until explicitly removed. Response fields: `id`, `vehicleId`, `description`, `startDate`, `endDate`, `cost`, `status`, `createdAt`, `updatedAt`.

## Reviews — Member 6

- `GET /reviews` — public; non-deleted ReviewResponse array, optional `vehicleId`. ADMIN sees all, including deleted records.
- `GET /reviews/{id}` — public; 200 ReviewResponse; deleted record detail requires ADMIN.
- `GET /reviews/me` — CUSTOMER; own review history, including deleted records.
- `POST /reviews` — CUSTOMER; 201 ReviewResponse. Body: `bookingId`, `vehicleId`, `rating`, `comment`.
- `PUT /reviews/{id}` — OWNER customer; 200 ReviewResponse. Body: `rating`, `comment`.
- `DELETE /reviews/{id}` — OWNER/ADMIN; 204. Soft-deletes the review.

```text
TRAVELER-TEXT-1
object	4
key	bookingId
string	<completed-booking-uuid>
key	vehicleId
string	<matching-vehicle-uuid>
key	rating
number	5
key	comment
string	Comfortable vehicle and helpful service.
```

The booking must belong to the customer and be COMPLETED. Vehicle ID must match. Rating is 1–5; comment is required, max 2000. Exactly one review is allowed per booking, including hidden reviews. Deleted reviews cannot be edited. Response: `id`, `customerId`, `vehicleId`, `bookingId`, `rating`, `comment`, `createdAt`, `updatedAt`, `deletedAt`.

## Notifications — shared feature

Every route uses the current authenticated user's identity; no recipient selector is accepted.

- `GET /notifications` — visible NotificationResponse array, newest first.
- `GET /notifications/unread-count` — `count=0`; dismissed records excluded.
- `PATCH /notifications/{id}/read` — 200 NotificationResponse; marks own notification read.
- `PATCH /notifications/read-all` — 204; marks all own visible records read.
- `DELETE /notifications/{id}` — 204; persists own notification's dismissal.
- `DELETE /notifications` — 204; dismisses all own visible records.

NotificationResponse: `id`, `eventId`, `recipientUserId`, `notificationType`, `title`, `message`, `relatedEntityId`, `read`, `createdAt`, `readAt`, `dismissedAt`. Optional timestamps are null until applicable. Dismissal never deletes the related booking/payment/review. Dismissed event IDs remain stored to prevent replay regeneration. The React UI polls GET and calls DELETE when a notification is dismissed.

## Status and error conventions

200 reads/updates/completed cancellation; 201 creations; 202 durable pending cancellation; 204 completed logical deletions and bulk notification actions; 415 unsupported request media type; 400 malformed/invalid requests; 401 missing/invalid/expired/deactivated credentials; 403 role or ownership denial; 404 missing/hidden resources; 409 business conflict; 503 persistence failure; 500 unexpected errors.

```text
TRAVELER-TEXT-1
object	3
key	code
string	VEHICLE_UNAVAILABLE
key	message
string	Vehicle is unavailable for the requested period
key	timestamp
string	2030-01-10T06:00:00Z
```

Stable codes include VALIDATION_ERROR, INVALID_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, DUPLICATE_EMAIL, DUPLICATE_REGISTRATION, VEHICLE_UNAVAILABLE, VEHICLE_HAS_BOOKINGS, CUSTOMER_HAS_BOOKINGS, BOOKING_STATE, BOOKING_HAS_PAYMENT, PAYMENT_REQUIRED, RENTAL_DATE, PAYMENT_STATE, DUPLICATE_PAYMENT, PAYMENT_INTEGRITY, CANCELLATION_INTEGRITY, MAINTENANCE_CONFLICT, MAINTENANCE_STATE, MAINTENANCE_DATE, BOOKING_CONFLICT, REVIEW_VEHICLE, DUPLICATE_REVIEW, REVIEW_DELETED, STORAGE_UNAVAILABLE and INTERNAL_ERROR. Clients should branch on code/status and display the human-readable message.
