# JSON usage audit

Inspection date: 2026-10-11. Scope: the complete application source, resources, runtime data/backups, tests, frontend proxy/configuration, documentation, diagrams and root development tooling. Third-party dependency/cache contents are classified as tooling, not rewritten.

## Original application usage and disposition

- `common/storage/JsonFileStore.java`: Jackson ObjectMapper, JSON array validation, seeds, primary files, backup files and atomic writes. Replaced by TextFileStore + TextCodec + TextMapper.
- `common/storage/JsonRepository.java` and all seven module repositories: delegated JSON persistence. Replaced/rewired to TextRepository/TextFileStore.
- `customer/User.java` and `vehicle/Vehicle.java`: Jackson subtype annotations. Removed; explicit text subtype tags preserve the same subclasses.
- `security/JwtService.java` and `config/SecurityConfig.java`: JWT header/claims and Jackson security errors. Replaced by TokenService/TextBearerFilter and text error output.
- `auth/AuthService.java`: JWT issuance dependency. Rewired to signed text tokens without changing credentials or response fields.
- Spring MVC's default JSON binding and `spring.jackson...` configuration: replaced by TextHttpConfig and removed the property.
- `backend/pom.xml`: starter-json is explicitly excluded; OAuth resource-server/JWT dependency removed. Packaged JAR inspection confirms no Jackson/Nimbus/OAuth/JSON-smart runtime libraries.
- `frontend/src/api/client.ts`: application/json, JSON.stringify and response.json. Replaced by text/plain, encodeText and decodeText.
- `frontend/vite.config.ts`: JSON proxy errors. Replaced by encoded text errors.
- `frontend/src/pages/maintenance/MaintenanceRecords.tsx`: JSON.stringify as an effect dependency key. Replaced by URL query encoding.
- Auth/storage tests, Fixture failure injection, frontend API tests, Playwright helper and Python smoke test: adapted to real text files/HTTP bodies. Deliberate forbidden-input tests retain JSON terminology/media type literals to prove rejection.
- API/recovery/OOP/setup documentation and PlantUML/SVG diagrams: updated; historical pre-change findings remain labeled as historical.

## Business files converted

All seven `data/runtime/{users,vehicles,bookings,payments,maintenance,reviews,notifications}.json` files became genuine `.txt` records. Both `data/runtime/backups/users-*.json` snapshots were converted. `backend/src/main/resources/data/seed/{users,vehicles}.json` became text seed files. All original bytes remain in the private rollback ZIP outside application runtime. See migration-verification.md for counts, hashes and equality checks.

## Exact retained configuration files

- `frontend/package.json` — required npm scripts and frontend dependencies.
- `frontend/package-lock.json` — dependency lock.
- `frontend/tsconfig.json` — TypeScript compiler options.
- `package-lock.json` — pre-existing empty root npm metadata.
- `.vscode/settings.json` — optional, ignored local editor configuration.

The first three are framework/build requirements; none stores rental records. The last two are also tooling, with no role in persistence. Generated `frontend/tsconfig.tsbuildinfo`, browser test reports, Vite caches/HMR and third-party dependency metadata may use JSON internally. Generated build/test files are excluded from version control. The runtime application's API uses text/plain.

## Private development-tool exceptions

`.tools/` is ignored and is not included in the application JAR or frontend source delivery. It contains a cached JDK/Maven repository, dependency metadata (including `.tools/jdk-metadata.json`), original scaffold-generation scripts and historical logs. These pre-existing scripts can refer to the old architecture and should not be used to regenerate the converted project:

- `.tools/add_api_recovery_test.py`
- `.tools/check-delivery.py`
- `.tools/diagrams.py`
- `.tools/foundation.py`
- `.tools/hardening.py`
- `.tools/models.py`
- `.tools/reports.py`
- `.tools/security_dtos.py`
- `.tools/services.py`
- `.tools/storage_api_tests.py`
- `.tools/test-imports.py`
- `.tools/tests.py`

The one-time `.tools/migrate-no-json.py` necessarily reads legacy JSON and verifies conversion. `.tools/no-json-originals.zip` retains historical source/data for private rollback, and `.tools/no-json-staged/` holds verified migration staging copies. They are not application-level storage and must be left out of a university submission. Do not delete the rollback archive until the migrated work has been accepted and backed up.

## Final application checks

Production Java and TypeScript sources have no JSON parsers/serializers, response.json calls, Jackson imports or JWT implementation. Remaining source mentions are the explicit Maven exclusion, legacy-filename rejection, old secret-name compatibility aliases and explanatory comments. All active primary and backup data files use the documented text grammar. JSON requests are rejected with HTTP 415, and the full browser workflows check the request format and reject JSON API responses.
