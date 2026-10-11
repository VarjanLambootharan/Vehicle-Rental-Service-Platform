# Run the backend on Windows 11 or IntelliJ IDEA

Use **JDK 21**. Maven Enforcer rejects other Java major versions; the system's Java 25/26 will not satisfy the project requirement. The Maven Wrapper downloads Maven 3.9.11 on first use and verifies its SHA-256 checksum. Internet access is needed for the initial Maven/dependency download.

## PowerShell

Open PowerShell in `backend/`. Set `JAVA_HOME` to a JDK 21 installation. For this workspace, an ignored local installation was prepared at `../.tools/jdk-21.0.12.1+1`; it is a convenience for this machine and is not part of the source distribution.

```powershell
# Choose your own JDK 21 installation, or use the workspace copy:
$env:JAVA_HOME = (Resolve-Path '../.tools/jdk-21.0.12.1+1').Path
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version

$env:ADMIN_EMAIL = 'admin@example.com'
$credential = New-Object System.Management.Automation.PSCredential('admin', (Read-Host 'Choose administrator password, at least 12 characters' -AsSecureString))
$env:ADMIN_PASSWORD = $credential.GetNetworkCredential().Password
# Generate once, then keep this value in your private environment configuration.
$keyBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($keyBytes)
$env:TOKEN_SECRET = [Convert]::ToBase64String($keyBytes)
$rng.Dispose()

$env:APP_STORAGE_PATH = [IO.Path]::GetFullPath('../data/runtime')
$env:TOKEN_EXPIRATION = '3600'
$env:FRONTEND_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173'
$env:APP_BUSINESS_TIMEZONE = 'Asia/Colombo'
$env:SERVER_PORT = '8080'

.\mvnw.cmd test
.\mvnw.cmd package
java -jar target/vehicle-rental-1.0.0.jar
```

Do not regenerate the token key at every restart if existing access tokens should remain valid. Keep secrets private; do not commit them or paste them into screenshots. The backend automatically imports `backend/.env` when launched from the project root, or `.env` when launched from `backend/`. Explicit environment variables in PowerShell, the IDE run configuration, or your deployment environment override values from `.env`; remove any stale or placeholder `TOKEN_SECRET` override.

The default storage property is `app.storage.path=${APP_STORAGE_PATH:../data/runtime}`. It assumes `backend/` as the working directory. Use an absolute `APP_STORAGE_PATH` if launching elsewhere.

On a first launch with an empty user store, `ADMIN_EMAIL` and `ADMIN_PASSWORD` are mandatory. Passwords must have at least 12 characters and fit BCrypt's 72-byte UTF-8 limit. The admin is created once; changing these environment values on ordinary restart does not reset its password. With existing users but no active administrator, startup fails and preserves those accounts. See [recovery](../docs/recovery.md).

`TOKEN_SECRET` must be Base64 encoding of at least 32 cryptographically random bytes. `TOKEN_EXPIRATION` is in seconds, defaults to 3600, and accepts 60–86400. Tokens use a versioned text payload signed with Java HmacSHA256, validate signature and time, and resolve the account and role from the current user file on every authenticated request. Deactivation invalidates access even for previously issued tokens. Frontend logout discards the token; there is no general server-side logout/revocation endpoint.

`FRONTEND_ORIGIN` accepts a comma-separated list of explicit origins. Wildcard `*` is rejected. Example: `http://localhost:5173,http://127.0.0.1:5173`. Send tokens in `Authorization: Bearer <token>`; cookies are not required.

`MOCK_PAYMENT_SUCCESS=true` is the default. Set it to `false` and restart to demonstrate failed MOCK_ONLINE payments. Customers never choose the result or amount. CASH_ON_PICKUP always starts pending; an admin records its result.

## IntelliJ IDEA

1. Open `backend/pom.xml` as a Maven project.
2. Set Project SDK and the Maven Runner JRE to Java 21; use the Maven Wrapper.
3. Create a Spring Boot/Application run configuration for `com.se1020.vehiclerental.VehicleRentalApplication`.
4. Set the working directory to `backend/`, or supply an absolute `APP_STORAGE_PATH`.
5. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TOKEN_SECRET` and any overrides in the run configuration's environment variables. Do not store secrets in a shared run configuration.
6. Run the application. Public catalogue requests use `http://localhost:8080/api/v1/vehicles`.
7. Run tests from `src/test/java`, or run Maven `test`/`package`. All tests use disposable temporary directories and generated test credentials.

## Optional packaged-server smoke test

With Python 3 and `JAVA_HOME` set to JDK 21:

```powershell
python scripts/smoke_test.py
```

This starts the executable JAR on an automatically assigned local port, performs authenticated HTTP operations, restarts twice, recovers a persisted cancellation, and checks that dismissed notifications stay hidden. Storage and generated credentials are disposable; the script stops its own server processes.

For source-only Maven builds no Python, PlantUML, Google Java Format, separately installed Maven, or external Tomcat is required. Optional UML SVG previews are included in `docs/class-diagrams/`.

## Plain-text compliance

Storage, API bodies and bearer tokens contain no application JSON. See [implementation and viva guide](../docs/no-json/implementation-and-viva.md). `TOKEN_SECRET` and `TOKEN_EXPIRATION` are preferred; the existing `JWT_SECRET` and `JWT_EXPIRATION` names remain fallback configuration aliases only. Existing private `.env` files do not need changing. Pre-conversion tokens require a fresh login.
