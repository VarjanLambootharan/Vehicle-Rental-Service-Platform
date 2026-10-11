# Plain-text implementation and viva guide

Converted on 2026-10-11 for the SE1020 Traveler Vehicle Rental Service Platform.

## What changed

The application now uses genuine UTF-8 plain text for all seven persistent business stores, HTTP request/response bodies, security errors and development proxy errors. JSON-bearing JWTs were replaced by signed text bearer tokens. Jackson serialization, Jackson model annotations and the OAuth/JWT runtime dependency were removed. No database, ORM or Java binary object serialization was introduced.

The existing React UI, navigation, controller routes, DTO field names, service rules and OOP domain hierarchies remain. The maintenance screen's filter dependency key uses URL query encoding instead of JSON.stringify; its filtering behavior is unchanged. Existing browser sessions require a fresh login because the token format changed. Account IDs, roles, BCrypt hashes and passwords were not reset.

Read the [pre-change assessment](pre-change-impact.md), [migration verification](migration-verification.md), [changed-file inventory](affected-files.txt) and [test results](../final-report/test-results.md).

## The seven business files

The default directory is `data/runtime/` when starting from `backend/`. `APP_STORAGE_PATH` can override it. Use an absolute path if launching elsewhere.

- `users.txt`: Admin/Customer subtype, UUID, name, email, BCrypt hash, phone, active flag and timestamps.
- `vehicles.txt`: Car/Motorcycle subtype, UUID, registration, brand/model, rate, description, status and subtype fields.
- `bookings.txt`: customer/vehicle UUIDs, rental dates, original daily rate, total, status, cancellation timestamps, nested cancellation workflow and source events.
- `payments.txt`: booking/customer UUIDs, amount, method, result, processed cancellation workflow ID, refund timestamp/reference and source events.
- `maintenance.txt`: vehicle UUID, description, service dates, cost, status and timestamps.
- `reviews.txt`: booking/customer/vehicle UUIDs, rating/comment, deletion timestamp and source events.
- `notifications.txt`: delivered event ID, recipient and related entity UUIDs, title/message/type, read state and dismissal timestamps.

A relationship remains a UUID reference to another record. Migration does not renumber IDs or generate replacement timestamps. Nested events remain stored with their originating record so notification delivery can resume after restart. Logical deletion preserves history and references.

## Text format

The format is named `TRAVELER-TEXT-1`. It is a small line-based format implemented by this project, not JSON with a different extension. Every file starts with that version header followed by one root list. An empty seed file is exactly:

```text
TRAVELER-TEXT-1
list	0
```

The separation after `list` above is a literal tab. Supported lines are `list<TAB>count`, `object<TAB>fieldCount`, `key<TAB>fieldName`, `string<TAB>value`, `number<TAB>value`, `boolean<TAB>true|false`, and `null`. A list is followed by its declared number of values. An object is followed by its declared number of key/value pairs. Nesting represents rental periods, workflows and events.

Strings escape backslash as `\\`, tab as `\t`, carriage return as `\r` and newline as `\n`. Sinhala, Tamil and other Unicode characters are UTF-8. Empty string and null have distinct representations. Decimal amounts are read directly into `BigDecimal` in Java; the migration uses Python `Decimal`, avoiding binary floating-point conversion. Dates are ISO local dates and timestamps are ISO instants.

For example, this is a complete HTTP profile-update body (the same format used inside storage):

```text
TRAVELER-TEXT-1
object	3
key	fullName
string	Example Customer
key	email
string	customer@example.com
key	phone
string	0771234567
```

Stored records include all declared fields, including explicit nulls for optional lifecycle fields. `type` selects only CUSTOMER/ADMIN or CAR/MOTORCYCLE when reconstructing those abstract domain types. Missing fields, unexpected fields, unknown subtypes, invalid types, duplicate keys, duplicate record IDs, truncation and trailing content fail explicitly. The codec limits nesting and collection counts; HTTP bodies are additionally limited to 1 MiB.

## Which Java classes read and write files?

Production paths below are relative to `backend/src/main/java/com/se1020/vehiclerental/`.

1. `common/storage/TextFileStore.java` owns `Path directory`, resolves the seven filenames, and uses `Files` for directory creation, stream creation, backup copies, temporary files, atomic moves and cleanup. `read()` opens a `BufferedReader` with `Files.newBufferedReader(path, UTF_8)` in try-with-resources. It calls `TextCodec.read()`, reconstructs typed objects with `TextMapper`, and rejects invalid identities. `write()` checks the typed records before committing them. `writeValue()` opens a `BufferedWriter` with `Files.newBufferedWriter()` in try-with-resources and calls `TextCodec.write()`.
2. `common/text/TextCodec.java` reads individual lines through `BufferedReader.readLine()` and writes tags/escaped values through `BufferedWriter.write()`. It implements the text grammar and escaping. It knows nothing about booking rules or HTTP authorization.
3. `common/text/TextMapper.java` converts domain fields and record DTOs into ordinary maps/lists/scalars and reconstructs them. Reflection is confined to this adapter, similar to the former serialization adapter: private model fields remain private, record DTOs use their canonical constructors, and the requested Java class comes from application code, never from an input class name. Required stored fields are checked so field initializers cannot invent a new identity on load.
4. `common/storage/TextRepository.java` implements generic `findAll`, `require(UUID)` and `save`. Customer, Vehicle, Booking, Payment, Maintenance, Review and Notification repositories supply their file name and domain type. They do not open files themselves.
5. `common/storage/StorageCoordinator.java` supplies the same fair reentrant lock used by services and storage. It serializes validation plus read/modify/write within this single application process.
6. `common/storage/TextStorageVerifier.java` is a read-only command-line checker. It opens each file with `Files.newBufferedReader`, validates typed reconstruction and compares all decoded fields. It never seeds or rewrites the dataset.

`TextHttpConfig.TextConverter` also uses buffered character output, but writes HTTP response streams rather than persistent files. The Python `text_format.py` helper is only for verification/smoke tests; Java performs all normal application persistence.

## How CRUD reaches disk

The flow remains UI → central API client → controller → service → repository → TextFileStore. Create and update call `save()`. Under the shared lock, `update()` reads the latest list, replaces the record with the same UUID (or adds a new record), and writes the replacement list. Reads reconstruct independent Java objects; changing an object does not change disk until saving succeeds.

Delete retains the original business semantics:

- Customers deactivate, subject to protected-booking checks; administrators can reactivate them.
- Vehicles become INACTIVE; protected bookings prevent invalid deletion.
- Bookings cancel through their durable cancellation workflow and remain in history.
- Eligible pending payments are voided; paid refunds occur only through booking cancellation.
- Scheduled maintenance can be cancelled; its history is retained.
- Reviews record `deletedAt`; hiding does not permit a second review for that booking.
- Notifications record `dismissedAt` and retain their event IDs so replay cannot recreate dismissed messages.

These are complete domain CRUD operations, including the original guarded/logical-delete behavior. Physical deletion would break the requested history and relationships.

## Safe writes and recovery

The writer creates a temporary file in the same directory, writes and closes the buffered writer, then calls `FileChannel.force(true)`. It copies the previous committed file to `backups/`, flushes that backup and retains at most five text backups per business file. `Files.move(..., ATOMIC_MOVE, REPLACE_EXISTING)` replaces the primary file. An unsupported atomic move fails; there is no partial-overwrite fallback. Normal failures remove temporary files.

On an empty directory the application creates seven text stores, using the two empty text seed resources for users/vehicles. `AdminInitializer` then creates the configured administrator only if the user store is empty. Existing data is never reseeded on restart. Legacy business filenames or an incomplete set of text stores cause startup to fail for offline recovery instead of silently creating replacement data. Corrupt records also fail rather than being discarded.

Cancellation still records its intent in `bookings.txt` before changing payments, then finalizes the booking. Workflow IDs make retries idempotent. `RecoveryRunner` checks typed stores, resumes cancellation and delivers pending events at startup and periodically. See [recovery details](../recovery.md).

## API communication and authentication

The strict interpretation of the restriction was implemented. Requests and responses use `text/plain; charset=utf-8` with the format above. `TextHttpConfig` supplies the Spring MVC converter; original DTO validation and authorization remain active. Unsupported request media types return 415. The frontend's `src/api/text.ts` encodes/decodes this format; `client.ts` sends it, attaches the bearer token and preserves error/session-expiry handling. Vite proxy errors use it too. The URLs, HTTP methods, status codes and UI components remain compatible with the updated central client. External API callers must adopt the text format; [API examples](../api.md) have been converted.

`TokenService` issues `t1.<user UUID>.<issued seconds>.<expiry seconds>.<random nonce>.<signature>`. The signature is HMAC-SHA256 over an application-prefixed text payload using Java's `Mac`; it contains no JSON header or claims. `TextBearerFilter` verifies signatures with constant-time comparison, checks time/format and reloads the active account/role. Password verification remains BCrypt. The token is stored as a string in sessionStorage, as before. It is not a persistent business data store. Logout clears it; there is no new refresh-token or revocation system.

`TOKEN_SECRET` (Base64 random bytes, at least 32 bytes) and `TOKEN_EXPIRATION` (60–86400 seconds) are the preferred environment variables. `JWT_SECRET` and `JWT_EXPIRATION` remain fallback aliases solely to preserve existing private configuration. They no longer activate JWT or JSON behavior. Do not regenerate the configured signing key merely to run the converted application.

## Record preservation and migration

The original runtime held two user records and empty lists for the other six components. Both users and both historical user backups were converted. The private `.tools/no-json-originals.zip` archive retains the original bytes for rollback. The offline migration utility is in ignored `.tools/`, outside the application's source and packaged JAR. It necessarily reads the old format once, stages text files, compares every decoded value, checks all references, invokes the Java verifier, checks source bytes against the archive again, and only then activates all new files and removes the legacy runtime copies.

The [migration report](migration-verification.md) records before/after counts and SHA-256 checksums without displaying personal data or password hashes. Linked transactions, events and tombstones were additionally exercised with disposable test data. A private rollback archive is not an active storage format and must not be submitted with the project.

## Explicit JSON exceptions and inspection boundaries

Application business data, seed data, API bodies and authentication tokens no longer use JSON. Remaining JSON-format files are tooling/configuration rather than rental records:

- `frontend/package.json`: React/Vite/npm dependencies and scripts; required by the existing frontend.
- `frontend/package-lock.json`: reproducible npm dependency resolution.
- `frontend/tsconfig.json`: TypeScript compiler configuration. The unused `resolveJsonModule` option was removed.
- Root `package-lock.json`: pre-existing empty npm metadata; retained without use as application storage.
- `.vscode/settings.json`: existing local editor/run configuration, if included in the workspace; not business data. These ignored editor files are optional for submission.
- Third-party `node_modules`, Maven dependency metadata, cached JDK/tools, generated TypeScript `.tsbuildinfo` caches and build/test/browser reports and development-tool protocols can contain JSON internally. They were not rewritten. Vite HMR and Playwright automation are tooling protocols, distinct from the application's rental API.
- The ignored private migration utility and rollback ZIP handle/retain historical JSON solely for conversion/recovery; neither ships in the runnable application. Historical wording in the pre-change assessment and negative tests identifying forbidden JSON inputs is documentation/testing, not runtime JSON use.

If the lecturer literally forbids even React's required package/TypeScript configuration or third-party tool internals, retaining the existing framework is incompatible with that broader rule. This implementation follows the requested explicit build-configuration exception and removes application-level usage.

## Viva demonstration

Open TextRepository.save → TextFileStore.update/read/writeValue → TextCodec and explain each responsibility. Show a disposable `vehicles.txt`, create a car through the admin UI, edit its rate, restart the server and show the retained record. Demonstrate that the same UUID appears in a booking's `vehicleId`. Cancel a paid future booking to show preserved booking/payment history and its workflow. Show a text/plain response in browser Network tools, then log in as a customer and demonstrate that admin routes are still forbidden. Do not display the real users.txt or private rollback archive in screenshots because they contain password hashes and personal data.

## Limits retained from the original architecture

Use one JVM against the directory. The lock does not coordinate multiple processes or manual edits. Atomic replacement protects one file, not a cross-file database transaction; cancellation/event workflows provide recovery between writes. Backups are per-file historical versions, not coordinated snapshots. Lists are read/rewritten as a whole, suitable for the assignment's dataset. Filesystem power-loss guarantees are platform-dependent. Payments/refunds remain simulations. These limits are unchanged by replacing serialization.
