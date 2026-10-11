# Frontend implementation plan and contract findings

1. Inspect repository, API reference, all controllers/DTOs, service and model state rules, security, storage configuration and the Atelier theme. Read the existing frontend API map from the prior chat's visualization directory. No backend edits required.
2. Implement React/TypeScript/Vite with Tailwind, a typed Fetch client, identity bootstrap via GET /auth/me, session expiry, public/customer/admin routes, accessible shared forms, dialogs, tables and feedback.
3. Preserve the reference's ivory, forest and champagne palette, serif editorial headings, split photographic hero and floating search panel. Add road-inspired graphics, responsive navigation and reduced-motion-aware animations. Use actual API data only.
4. Deliver the 18 member pages plus details, dashboards, authentication and notifications. Respect state transitions; label logical deletions precisely. Add date editing to booking details and owner review editing.
5. Verify TypeScript, lint, production build, state-rule unit tests and browser/API integration using disposable backend storage when available. Document coverage, limitations, setup and all changed files.

## Verified constraints

- Base path is /api/v1. Bearer authentication; no refresh/revocation/password reset or admin profile update. Session role comes from /auth/me. Customers cannot call administrative endpoints.
- All lists are arrays, without server pagination. Search exists for vehicles, customers and maintenance; other filters/pagination operate on fetched records.
- Rental intervals exclude the return date. Business dates use the configured Asia/Colombo timezone by default. Server owns amounts and eligibility.
- No image fields/uploads or seeded vehicles exist. Static media can be mapped by exact ID or exact brand/model; unmatched vehicles receive a clearly labelled neutral illustration. Hero photography is editorial, never inventory evidence.
- No locations, delivery, insurance, real payment gateway, availability calendar or dashboard aggregates exist. Do not invent these features.
- Customer/vehicle deletion deactivates; booking deletion cancels, possibly returning 202; payment deletion voids; maintenance deletion cancels scheduled work; reviews are soft-hidden without restoration; notifications are dismissed.
- Backend validation errors provide one message, not structured per-field errors. Display it alongside client field constraints.
- Joining vehicle names from permitted catalogue responses may fail for inactive historical vehicles; retain the vehicle ID and explain unavailable details.

See README.md and docs/crud-matrix.html for delivered routes, limitations and verification results.
