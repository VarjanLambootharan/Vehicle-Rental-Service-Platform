# Traveler frontend

A React + TypeScript frontend for the existing SE1020 Spring Boot application. It includes **18 required member-specific pages**, additional detail/edit pages, public browsing, registration/login, customer/admin dashboards and notifications. All production records and mutations come from the existing REST API; there are no demo record arrays or local CRUD stores.

## Run locally

1. Start the backend using `../backend/README.md` (JDK 21, port 8080 by default). Preserve your private administrator and token configuration.
2. In a second PowerShell terminal:

```powershell
cd 'C:\Users\Varjan\Desktop\OOP code\frontend'
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:5173`. Node 22.12+ or a compatible newer release is required by Vite. Development uses a same-origin Vite proxy: browser `/api/v1` requests are forwarded to `http://localhost:8080/api/v1`. There is no need to modify the backend for development CORS. The port is strict so a second frontend instance fails visibly rather than silently changing ports.

The catalogue starts empty on a fresh backend. Sign in using the administrator configured at backend initialization and add cars or motorcycles from **Admin dashboard → Vehicles → Add vehicle**. Register a separate customer account for the customer workflow. No administrator passwords or generated test credentials are committed.

## Configuration and deployment

- `VITE_API_BASE_URL`: defaults to `/api/v1`, which sends browser traffic through Vite's same-origin proxy. For a separately served frontend, set it to `http://localhost:8080/api/v1` and include the frontend's exact origin in backend `FRONTEND_ORIGIN`.
- `TRAVELER_API_TARGET` (legacy `VRS_API_TARGET` remains supported): Vite proxy target, default `http://localhost:8080`. Values in `.env.local` are loaded by Vite configuration. Restart `npm run dev` after changing this setting.
- `VITE_BUSINESS_TIMEZONE`: default `Asia/Colombo`; match backend `APP_BUSINESS_TIMEZONE`.
- `npm run build` creates `dist/`. Serve it with SPA fallback to `index.html` for application routes and proxy `/api` to Spring Boot, or build with an absolute API URL. `npm run preview` previews assets only; it is not the configured development API proxy. Use an absolute API URL for that preview.
- Never put credentials or token signing secrets in `VITE_*` variables; those values are public.

## Main journeys

- Public: home → vehicle collection → vehicle details → sign in/register.
- Customer: dashboard → create reservation → payment → booking details/history → completed-rental review. Profile and notifications are reachable from the workspace navigation.
- Administrator: dashboard → customers, fleet, bookings, payments, maintenance and review moderation. Each module has navigation to its supported create/edit/detail pages.
- All admin routes require ADMIN. Customer routes require CUSTOMER. `/auth/me` supplies the current authoritative identity; the backend checks every request.

See [CRUD matrix](docs/crud-matrix.html) for the exact 18-page assessment allocation, endpoint bindings and unsupported operations. Additional routes include `/`, `/login`, `/register`, `/dashboard`, `/admin`, `/vehicles/:id`, `/bookings/:id`, `/admin/bookings/:id`, `/payments/:id`, `/admin/payments/:id`, `/reviews/:id/edit`, `/admin/vehicles`, `/notifications`, `/forbidden` and the catch-all not-found page.

## Architecture

- `src/api`: central Fetch transport, explicit typed DTO services, query construction and normalized errors.
- `src/types`: TypeScript request/response models derived from actual Java DTOs.
- `src/contexts`: session identity bootstrap, tab-scoped sessionStorage token handling, sign-out and 401 expiry.
- `src/components`: common forms/feedback, native modal confirmations, paginated tables, navigation, vehicle cards and media fallbacks.
- `src/hooks/useResource.ts`: loading/error/retry state with stale-response suppression and explicit refresh after writes.
- `src/pages`: public/authentication and six module page groups.
- `src/routes`: role guards. Pages are lazy loaded.
- `src/utils`: business-timezone dates, money formatting and conservative lifecycle action hints. These hints never replace server validation.
- `src/styles`: Traveler indigo/navy tokens, responsive layouts, modern cards and forms, subtle hover and loading animations and reduced-motion overrides.

## Media and design

Traveler uses a redesigned photographic homepage, indigo accents, navy workspaces, rounded cards and a consistent sans-serif design system. The existing editorial hero photograph is retained and labelled as inspiration. Inventory, rates, dashboard totals and status charts all come from actual API records. Signed-in customers and administrators get role-specific shortcuts directly on the homepage.

The backend has no image fields, upload routes or seeded vehicle identifiers. Add licensed, matching photographs under `public/assets/vehicles/` and entries in `src/assets/vehicleMedia.ts` keyed by exact vehicle UUID or normalized exact `brand model`. Example entry syntax: `"toyota aqua": { src: "/assets/vehicles/toyota-aqua.jpg", alt: "Toyota Aqua exterior" }`. Only map a photograph after verifying it matches. Unmapped and failed photos render a neutral car/motorcycle illustration clearly marked “Vehicle photograph coming soon.” Do not use an unrelated luxury car to represent another model. The editorial hero is bundled locally and works offline; its original source is recorded in `public/assets/ATTRIBUTION.md`.

## Backend limitations and precise semantics

- Customer creation is registration. Admin customer creation, profile editing, password reset/change, refresh tokens, server logout/revocation and admin profile editing are unsupported. Sign-out discards the browser token.
- Tokens are stored only for the browser tab session. A 401 clears the session; a transient identity-load failure shows a retry screen instead of silently treating it as logged out. The API has no refresh endpoint.
- Customer and vehicle deletion means deactivation. Admins can reactivate accounts and set vehicle status to AVAILABLE. Protected bookings can prevent restrictions.
- Booking changes require a future confirmed booking with no pending/paid payment. Cancellation retains records and may return CANCELLATION_PENDING (HTTP 202); the page offers refresh/resume and does not falsely claim it is complete.
- A booking estimate uses current rate × exclusive rental days only for display. Creation sends vehicleId and dates only. Checkout uses the server's stored total; payment creation sends bookingId and method only.
- CASH_ON_PICKUP is pending; MOCK_ONLINE is simulated. No payment gateway/card forms exist. Only pending payments on confirmed bookings can become paid/failed/voided. Refunds are driven by cancellation, with no standalone refund or physical-delete UI.
- Maintenance creation is always SCHEDULED. Vehicle identity is immutable. Only scheduled details can change; start/complete use PUT with existing details and the next permitted status. Only scheduled records can be cancelled. Maintenance and manual vehicle status are separate restrictions.
- Reviews require a completed booking and are limited to one per booking, including hidden reviews. Owners edit; owners/admins may permanently soft-hide. No restore or hard deletion is supported, and public author names are not exposed.
- Notifications refresh every 30 seconds while their page is open; unread count also polls. Dismissal is persistent and does not delete related business records. No push/WebSocket API exists.
- Lists are complete arrays. Vehicle/customer/maintenance queries use supported server filters; other searches/status filters and 8-row table pagination are local views of real responses. Dashboards derive counts from actual lists. These lists are suitable for a university dataset, not a large production fleet.
- Historical inactive vehicles may not be public-readable. Their existing UUID remains visible rather than inventing a name. Public reviews omit hidden records even if an admin is viewing the public detail page.
- No pickup-location selection, delivery, insurance, availability calendar, payment refunds screen, media upload, OpenAPI generation, aggregate endpoint or optimistic concurrency contract was added.
- Form constraints supplement server validation. API validation messages are displayed intact; they are not structured field errors. Mutations are never automatically retried; if a connection drops, refresh records before retrying to avoid repeating an action. Read retries are explicit.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Browser tests require the packaged JAR at `backend/target/vehicle-rental-1.0.0.jar`, JDK 21, and Chrome. They launch Vite on the dedicated test port 15173 and a separate backend on 18080 with fresh OS temporary storage and generated in-memory credentials. Both ports must be free. The tests perform real writes only in their temporary store and stop their server afterward.

Windows defaults use this workspace's `.tools/jdk-21.0.12.1+1/bin/java.exe` and installed Chrome. Override `VRS_TEST_JAVA` and `VRS_BROWSER_PATH` for other installations/platforms. Do not point these tests at a live backend. Browser test fixtures are isolated from production code and are never shown as live production inventory.

See [verification results](docs/verification.md) for actual runs and coverage, and [created/modified files](docs/files.txt) for the delivery inventory.

## Viva demonstration

Follow [the six-member walkthrough](docs/viva-walkthrough.md) for a practical sequence that respects booking, payment, maintenance and review rules.

## Visual previews

Saved browser captures: [desktop homepage](docs/screenshots/home-desktop.png), [mobile homepage](docs/screenshots/home-mobile.png), and [mobile administration](docs/screenshots/admin-mobile.png). These captures were taken against the isolated verification server; no demonstration records were inserted into your existing backend.
