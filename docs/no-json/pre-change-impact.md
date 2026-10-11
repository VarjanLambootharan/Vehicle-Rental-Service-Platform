# No-JSON conversion: pre-change impact assessment

Prepared before implementation on 2026-10-11.

## Scope and expected impact

Use the strict interpretation: no JSON business files, request/response bodies, proxy/security errors, or JSON-bearing JWT tokens. Keep the React UI, route structure, DTO fields, controllers, service rules, BCrypt hashes, IDs, references, timestamps, events and soft-delete semantics. No database will be introduced.

Replace JsonFileStore and JsonRepository with TextFileStore and TextRepository. Store seven UTF-8 .txt files using a documented versioned, typed, escaped line format (not JSON renamed to .txt). Use BufferedReader/BufferedWriter, Files/Path, try-with-resources, the existing shared lock, flushed temporary files, atomic replacement and five backups. Keep nested cancellation/event records. Add a strict shared text codec and object mapper; only the persistence adapter reconstructs private domain state.

Use the same text format over HTTP with text/plain; update the central frontend API client and development proxy. Replace JWT with a versioned HMAC-SHA256 signed text bearer token. Existing browser sessions must sign in again; accounts/passwords and authorization rules remain unchanged. Preserve legacy secret environment variable aliases to avoid exposing or rewriting private configuration.

Migration runs offline after taking a private rollback archive, verifies full decoded equality and references before activating files, and preserves originals in that archive. Runtime must refuse legacy files rather than silently initialize empty .txt stores. Convert historical backups too. Tests must use disposable storage, never mutate the user's records. Stop any server using the directory before migration. No active default-port listener was found during inspection.

## Existing primary record counts

- bookings: 0
- maintenance: 0
- notifications: 0
- payments: 0
- reviews: 0
- users: 2
- vehicles: 0

## Existing files directly referencing JSON/JWT (source, tests, documentation, diagrams and data)

- `README.md`
- `backend/README.md`
- `docs/api.md`
- `docs/recovery.md`
- `frontend/package-lock.json`
- `frontend/README.md`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/docs/files.txt`
- `frontend/docs/traveler-redesign.md`
- `frontend/docs/verification.md`
- `frontend/tests/workflows.e2e.ts`
- `frontend/src/api/client.test.ts`
- `frontend/src/api/client.ts`
- `frontend/src/pages/maintenance/MaintenanceRecords.tsx`
- `docs/class-diagrams/booking-management.puml`
- `docs/class-diagrams/booking-management.svg`
- `docs/class-diagrams/customer-management.puml`
- `docs/class-diagrams/customer-management.svg`
- `docs/class-diagrams/maintenance-management.puml`
- `docs/class-diagrams/maintenance-management.svg`
- `docs/class-diagrams/notification-system.puml`
- `docs/class-diagrams/notification-system.svg`
- `docs/class-diagrams/payment-management.puml`
- `docs/class-diagrams/payment-management.svg`
- `docs/class-diagrams/review-management.puml`
- `docs/class-diagrams/review-management.svg`
- `docs/class-diagrams/system-overview.puml`
- `docs/class-diagrams/system-overview.svg`
- `docs/class-diagrams/vehicle-management.puml`
- `docs/class-diagrams/vehicle-management.svg`
- `docs/final-report/folder-tree.txt`
- `docs/final-report/implementation-report.md`
- `docs/final-report/test-results.md`
- `docs/oop-documentation/class-responsibilities.md`
- `docs/oop-documentation/module-relationships.md`
- `docs/oop-documentation/oop-concepts.md`
- `backend/scripts/smoke_test.py`
- `backend/src/test/java/com/se1020/vehiclerental/auth/AdminInitializerTest.java`
- `backend/src/test/java/com/se1020/vehiclerental/auth/AuthApiTest.java`
- `backend/src/test/java/com/se1020/vehiclerental/support/Fixture.java`
- `backend/src/test/java/com/se1020/vehiclerental/common/storage/JsonFileStoreTest.java`
- `backend/src/main/resources/application.properties`
- `backend/src/main/java/com/se1020/vehiclerental/auth/AuthService.java`
- `backend/src/main/java/com/se1020/vehiclerental/booking/BookingRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/config/SecurityConfig.java`
- `backend/src/main/java/com/se1020/vehiclerental/customer/CustomerRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/customer/User.java`
- `backend/src/main/java/com/se1020/vehiclerental/maintenance/MaintenanceRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/notification/NotificationRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/payment/PaymentRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/review/ReviewRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/security/JwtService.java`
- `backend/src/main/java/com/se1020/vehiclerental/vehicle/Vehicle.java`
- `backend/src/main/java/com/se1020/vehiclerental/vehicle/VehicleRepository.java`
- `backend/src/main/java/com/se1020/vehiclerental/common/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/se1020/vehiclerental/common/storage/JsonFileStore.java`
- `backend/src/main/java/com/se1020/vehiclerental/common/storage/JsonRepository.java`

## Additional affected files / additions

- `backend/pom.xml`: remove JSON and OAuth/JWT runtime dependencies.
- `backend/.env.example`, `frontend/.env.example` as needed: document configuration.
- `data/runtime/*.json`, `data/runtime/backups/*.json`: convert to genuine text; preserve originals privately.
- `backend/src/main/resources/data/seed/*.json`: replace with empty text lists.
- New `common/text/TextCodec.java`, `TextMapper.java`; new HTTP converter/configuration.
- New `security/TokenService.java` and bearer authentication filter.
- New `frontend/src/api/text.ts` and protocol tests; Python text codec for smoke testing.
- Storage/security/API tests plus existing fixtures and admin initialization tests.
- `docs/no-json/`: pre-change inventory, migration verification, implementation/viva report and measured test results.
- Existing API, recovery, architecture and setup documentation and diagram labels must describe the new implementation.

## Build/tooling exceptions

Keep `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, root `package-lock.json`, and existing `.vscode/*.json` editor configuration. Third-party `node_modules`, downloaded tools/JDK metadata, Maven/Spring metadata and generated browser/build reports may contain JSON; they are not application data storage or application protocol. The offline migration necessarily reads the old JSON once and is kept outside application runtime in ignored `.tools/`. The private rollback archive contains original JSON for recovery; it is not read by the new application and is not part of the submission.

## Verification plan

Run all existing Java service/storage/security tests, extend protocol and migration coverage (Unicode, delimiters, nulls, polymorphism, malformed files, duplicate IDs, backup/atomic failure, concurrency). Run frontend unit tests, lint and production build, packaged-server smoke/restart recovery and full Playwright workflows for login, vehicle/customer management, booking, payment, maintenance, reviews, notifications and navigation. Explicitly verify no business .json files or JSON HTTP messages remain. Report actual outcomes and limitations, not assumed passes.
