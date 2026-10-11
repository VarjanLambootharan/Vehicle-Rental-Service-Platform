# Executed verification — 11 October 2026

Environment: Windows, Eclipse Temurin OpenJDK 21.0.12.1+1, Apache Maven 3.9.11, Spring Boot 3.5.15, Node.js 24, Vitest 3.2.7, Playwright 1.56.0 (Google Chrome headless). The Maven Enforcer Java 21 rule passed.

The application has been converted to the strict no-JSON specification: all persistent business storage uses genuine plain-text UTF-8 files (`TRAVELER-TEXT-1`), all application API requests and responses use `text/plain; charset=utf-8`, and authentication uses HMAC-SHA256 signed text bearer tokens without JSON headers or claims.

Commands executed from the repository root and `frontend/`:

```powershell
# Backend clean build, test, and package:
$env:JAVA_HOME = (Resolve-Path '.tools/jdk-21.0.12.1+1').Path
& ./.tools/apache-maven-3.9.11/bin/mvn.cmd -f backend/pom.xml '-Dmaven.repo.local=.tools/m2' clean package

# Backend packaged-server smoke and restart recovery:
$env:JAVA_HOME = (Resolve-Path '.tools/jdk-21.0.12.1+1').Path
python backend/scripts/smoke_test.py

# Read-only runtime storage verification:
& .tools/jdk-21.0.12.1+1/bin/java.exe -cp backend/target/classes com.se1020.vehiclerental.common.storage.TextStorageVerifier (Resolve-Path "data/runtime").Path

# Frontend unit tests, production build, and linting (from frontend/):
npm run test
npm run build
npm run lint

# Frontend browser end-to-end workflows (from frontend/):
npm run test:e2e
```

## Maven test and package results

The Maven build completed with **BUILD SUCCESS**. The package run executed **102 tests, 0 failures, 0 errors, 0 skipped** and produced `backend/target/vehicle-rental-1.0.0.jar` (executable Spring Boot archive with embedded Tomcat, without Jackson or JWT/OAuth runtime dependencies).

- `AdminInitializerTest`: 2 tests; 0 failures; 0 errors.
- `AuthApiTest`: 13 tests; 0 failures; 0 errors (validates plain-text bodies, rejects `application/json` with HTTP 415, and tests signed bearer token flows).
- `BookingServiceTest`: 8 tests; 0 failures; 0 errors.
- `CancellationRecoveryTest`: 9 tests; 0 failures; 0 errors.
- `LinkedRecordsTest`: 1 test; 0 failures; 0 errors (linked entity integrity across restarts).
- `TextFileStoreTest`: 10 tests; 0 failures; 0 errors (atomic replacement, backup rotation, locking, error recovery).
- `TextProtocolTest`: 11 tests; 0 failures; 0 errors (line grammar, delimiters, Unicode escaping, type mapping).
- `CustomerServiceTest`: 7 tests; 0 failures; 0 errors.
- `MaintenanceServiceTest`: 10 tests; 0 failures; 0 errors.
- `NotificationServiceTest`: 8 tests; 0 failures; 0 errors.
- `PaymentServiceTest`: 9 tests; 0 failures; 0 errors.
- `ReviewServiceTest`: 6 tests; 0 failures; 0 errors.
- `VehicleServiceTest`: 8 tests; 0 failures; 0 errors.

Tests use JUnit 5, AssertJ, Spring Boot Test/MockMvc, Mockito, and isolated disposable directories. Coverage includes:
- Eight simultaneous booking attempts (exactly one accepted, concurrency-safe);
- Atomic replacement failure preserving committed data;
- Five-backup retention and rotation;
- Delimiter and Unicode escaping in `TRAVELER-TEXT-1`;
- Rejection of corrupt lines, duplicate IDs, and missing required fields;
- Subtype round trips (`Car` / `Motorcycle` and `Customer` / `Admin`);
- Owner and administrator authorization checks;
- Signed text bearer token validation (tampering, wrong key, expiration);
- Live account deactivation guards against active bookings;
- Plain-text Spring MVC serialization and CORS headers;
- Server-controlled amounts and state transitions;
- Durable cancellation workflows and idempotent recovery;
- Notification retry and dismissal replay prevention.

## Packaged-server smoke and restart recovery

Result: **PASS**.

- Executable JAR startup on dynamic loopback port;
- Default administrator login;
- Customer registration and profile management;
- Vehicle creation;
- Booking creation and server-side price calculation;
- Simulated payment execution;
- Booking cancellation and automatic refund tracking;
- Two process restarts with recovery verification;
- Startup recovery of durable `CANCELLATION_PENDING` intent;
- Unchanged refund timestamp across restart cycles;
- Dismissed notifications remaining permanently hidden;
- Seven plain-text primary files validated on disk.

The smoke test creates disposable credentials and storage, manages its own background server processes, and cleans up temporary test directories upon completion.

## Offline read-only storage verification

Result: **PASS** (`TextStorageVerifier` executed directly against `data/runtime`):

- `users.txt`: 2 records verified
- `vehicles.txt`: 0 records verified
- `bookings.txt`: 0 records verified
- `payments.txt`: 0 records verified
- `maintenance.txt`: 0 records verified
- `reviews.txt`: 0 records verified
- `notifications.txt`: 0 records verified

All decoded records match their serialized representations identically; UUIDs, BCrypt hashes, roles, and timestamps remain completely intact.

## Frontend unit tests, build, and linting

- **Vitest unit tests**: **4 test files, 27 tests, 0 failures, 0 skipped**
  - `src/api/text.test.ts` (10 tests): plain-text codec parsing, serialization, escaping, nested types, errors.
  - `src/utils/authRedirect.test.ts` (3 tests): role routing and authentication redirects.
  - `src/api/client.test.ts` (7 tests): HTTP error handling, text responses, timeout management.
  - `src/utils/rules.test.ts` (7 tests): business validation rules.
- **Production build** (`tsc -b && vite build`): **PASS** (1624 modules transformed, 0 TypeScript errors).
- **ESLint** (`eslint .`): **PASS** (0 warnings, 0 errors).

## Browser end-to-end workflows (Playwright)

Executed using Playwright with headless Chrome against a live backend process and Vite dev server.

Result: **9 passed, 0 failed** (all serial workflow scenarios completed successfully):

1. `public routes, empty catalogue, filters, mobile layout and access guards` — PASS
2. `admin creates, edits, deactivates and restores a real vehicle` — PASS
3. `customer registers, updates profile, books, edits dates and records cash payment` — PASS
4. `admin records payment, customer cancellation refunds it, notifications persist` — PASS
5. `paid rental starts and completes, customer creates edits and hides review` — PASS
6. `maintenance create, edit, cancel, start and complete; admin moderation and customer access` — PASS
7. `all pending payment outcomes, admin review hiding, expired session and network errors` — PASS
8. `shared sign-in, verified role redirects, homepage hubs, refresh and logout` — PASS
9. `motorcycle form, individual notifications, responsive customer screens and self-deactivation` — PASS

**Strict Protocol Validation**: Throughout all 9 browser workflows, the test harness inspected all browser HTTP traffic:
- Every outgoing application API request body was verified to be plain text matching the `TRAVELER-TEXT-1` grammar;
- No application API response returned `application/json`;
- Any failure in protocol enforcement immediately failed the test.

## Documentation checks

All **8 PlantUML files** passed `plantuml -checkonly` and rendered to SVG. The architecture reflects `TextFileStore`, `TextRepository`, `TextCodec`, `TextMapper`, and `TokenService`. REST routes, Plain-text API formats, and recovery workflows are documented in `docs/api.md` and `docs/recovery.md`.

## Boundaries of verification

- Storage is coordinated within a single application process via a fair reentrant lock;
- Individual file updates use atomic replacement (`Files.move` with `ATOMIC_MOVE`), backed by historical versioning;
- Multi-file coordination relies on durable cancellation workflows rather than distributed two-phase commits;
- Tests do not benchmark high-concurrency enterprise load or power-loss filesystem resilience;
- Payment and refund gateways are simulated.
