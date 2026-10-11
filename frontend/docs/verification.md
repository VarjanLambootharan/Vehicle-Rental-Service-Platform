# Frontend verification

Performed on 10 October 2026 using Windows, Node 26.11.1, Chrome and JDK 21.0.12.1. No backend source or runtime data was changed for the frontend implementation. Test-generated records were confined to a fresh OS temporary store.

## Build and static checks

- Dependency installation: passed; reproducible `package-lock.json` included.
- `npm run typecheck`: passed with strict TypeScript checking.
- `npm run lint`: passed with ESLint and React hook rules.
- `npm run build`: passed. Vite emits lazy-loaded page bundles and `dist/`; main JavaScript is approximately 92 kB gzip, CSS under 9 kB gzip. The local hero photograph is approximately 303 kB.
- `npm test`: **17 tests passed** across API transport, authentication redirects and lifecycle rules.
- Existing backend Maven `package` including tests: **89 tests passed**, zero failures/errors/skips; executable JAR built successfully.

## Unit coverage

Bearer header and exact request-body handling; 201 creation; 202 durable cancellation state; bodyless 204; preservation of conflict codes/messages; 401 expiry versus failed login; no automatic mutation retry; query encoding; confirmed/future cancellation; date editing with pending/paid attempts; duplicate/refunded payment restrictions; paid rental start within a half-open date interval; maintenance start eligibility; exclusive rental days/year boundaries; Asia/Colombo business date.

## Real browser/API coverage

The Playwright suite launches the unchanged packaged Spring Boot application on port 18080 with generated in-memory credentials, an isolated temporary file store and `MOCK_PAYMENT_SUCCESS=true`. The browser accesses it through Vite's real proxy. All business mutations below use actual HTTP endpoints and persisted backend records.

1. Public homepage, empty catalogue, date-filter validation/correction, local hero image, mobile menu, unauthenticated protected-route redirect and not-found page.
2. Administrator sign-in; car creation, rate editing, deactivation and reactivation; catalogue and detail reads.
3. Customer registration, profile update, booking creation, booking-date edit, cash payment, protected-booking account-deactivation rejection and customer-to-admin forbidden routing.
4. Administrator marks pending cash payment paid; customer cancels future booking; simulated refund appears in payment history; mark-all-read and notification dismissal survive reload.
5. Customer mock-online payment; administrator starts/completes a rental; owner review creation, editing and soft hiding; no replacement review after hiding.
6. Maintenance creation, scheduled edit, cancellation, start and completion; maintenance history; review/customer details; customer deactivation/reactivation; mobile admin route checks.
7. Pending-payment failure and voiding; admin review soft hiding; invalid-session expiry; aborted-network error presentation and successful manual retry.
8. Motorcycle creation and subtype editing; inactive status confirmation; individual notification read/dismiss; customer screens at 390, 768 and 1440 px; successful self-deactivation with backend verification.

**Final expanded suite: 9 scenarios passed, zero failures and zero skipped.** No uncaught browser runtime errors were observed. The suite also verifies role-aware sign-in redirects, customer/admin homepage hubs, session persistence, secure role tampering rejection, responsive layouts, scroll-aware homepage navigation and clearing the new-vehicle form only after a confirmed save. Successful account deactivation explicitly returns to sign-in, consistently with the protected-route guard; the final scenario verifies the stored account is inactive.

## Visual and accessibility checks

Desktop and mobile screenshots inspected directly. Confirmed ivory/forest/champagne styling, reference hero composition, real empty-state treatment, responsive navigation and scrollable management tables without page overflow. The original externally loaded photo was bundled locally after the first screenshot revealed delayed loading.

Forms use associated labels and native constraints; modal confirmations use native `dialog` focus management, Escape dismissal and an initial safe-action focus; loading/success/error messages have live roles; links/buttons have keyboard focus styles; the table scroll region is keyboard-focusable. Reduced-motion overrides disable animation/transitions. This was a focused inspection, not an exhaustive assistive-technology or WCAG audit.

## Verification boundaries

- Tested in installed Chrome only, not Safari/Firefox or physical mobile devices.
- Initial normal backend on 8080 was not running. End-to-end verification used a real disposable backend instance, not a simulated API or the user's existing dataset.
- No real payment gateway exists. All financial outcomes are simulations, accurately labelled in the UI.
- Storage-failure/recovery branches and durable pending cancellation are covered by existing backend tests and frontend transport tests; no disk-failure injection was performed through the browser.
- `MOCK_PAYMENT_SUCCESS=false` was not enabled in the browser run. Backend payment tests cover mock failure; the UI displays returned FAILED results and allows eligible retry.
- No production deployment, full security audit, load test or large-dataset performance claim is made.
- Asset mappings have no fabricated stock records. Unmapped vehicles use labelled illustrations because the API has no media support and seed arrays are empty.
