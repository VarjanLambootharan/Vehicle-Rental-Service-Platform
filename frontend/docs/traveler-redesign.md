# Traveler redesign

## Inspection and plan

The existing frontend is React 19, TypeScript, Vite, React Router, Tailwind and shared CSS. Spring Boot provides signed text bearer authentication and plain-text file persistence. There is no relational database. All six existing modules and lifecycle APIs remain the source of truth.

1. Replace the editorial theme with a modern Traveler identity: indigo, navy and light neutral surfaces; sans-serif typography; rounded, accessible components.
2. Rebuild the homepage around vehicle search and role-aware feature shortcuts. Centralize navigation for the header, mobile menu, workspace and homepage.
3. Rebuild both dashboards using real response counts and status-distribution charts. Retain all CRUD screens and simplify their language.
4. Keep one sign-in page. Confirm identity through `/auth/me`, send administrators to `/admin`, and allow only suitable internal return paths for customers. Keep server-enforced authorization and existing account/storage relationships.
5. Verify branding, navigation, refresh/logout, incorrect credentials, browser-storage tampering, responsive layouts and all previous CRUD workflows. Update screenshots and report actual test results.

## Administrator provisioning

The existing `AdminInitializer` securely creates the first administrator in an empty store using privately supplied `ADMIN_EMAIL` and `ADMIN_PASSWORD`; BCrypt hashes the password. `TOKEN_SECRET` must also be configured. There is no public default password, public administrator registration or frontend role selector. Existing populated stores without an active administrator are preserved and startup directs the operator to `docs/recovery.md`. Changing initialization variables never resets existing credentials. No backend change is needed for shared sign-in or provisioning.

Verification results and the modified-file inventory will be recorded after implementation.
