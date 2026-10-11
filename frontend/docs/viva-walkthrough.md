# Six-member viva walkthrough

Use the normal backend you configured, not the disposable automated test server. Start it first, then run `npm run dev` from `frontend/`. Open two browser profiles, or use a normal window and an incognito window, for the administrator and customer. Each browser tab holds its own session token.

## Preparation

Sign in with the administrator created by the backend configuration. Create one car and one motorcycle using the actual fleet forms. Add a verified local photo mapping if you have a photograph of either exact model; the default illustration is intentionally labelled when no verified photograph exists. Register a customer from the public registration page.

## Member 1 — Customer

1. Customer: open `/profile`, view account details and membership date.
2. Open `/profile/edit`, change name/phone/email and save. Show server validation for a duplicate email if another account exists.
3. Administrator: open `/admin/customers`, search, inspect details and deactivate/reactivate the customer. Explain that protected bookings prevent deactivation. At the end of the demo, a customer with no protected bookings can also deactivate their own account.

Registration demonstrates customer creation, but is additional to the three counted module pages.

## Member 2 — Vehicle

1. Public `/vehicles`: search, choose a type/passenger count, and apply a pair of dates to check actual availability.
2. Administrator `/admin/vehicles/new`: create a car or motorcycle. Show subtype-specific fields.
3. Follow “Manage vehicle” to edit its rate or details, change status, deactivate and restore it. Type cannot change. Existing bookings preserve the saved rental rate.

## Member 3 — Booking

1. Customer `/bookings/new`: choose a pickup strictly after today and a later return date, select an available vehicle and confirm.
2. From `/bookings`, open details and change the dates before recording any pending/paid payment. Show the saved total and cancel a future booking if desired.
3. Administrator `/admin/bookings`: inspect the booking and demonstrate cancellation. For starting/completing a rental, create a separate booking whose interval includes today and first record a paid payment.

Cancellation is retained in history. Return day is excluded from the rental interval. CANCELLATION_PENDING is a durable intermediate state, not a failure or deletion.

## Member 4 — Payment

1. Customer `/payments/new`: select a confirmed booking and CASH_ON_PICKUP. The returned record is pending.
2. `/payments`: inspect its amount, booking association, method and result.
3. Administrator `/admin/payments`: mark a pending attempt paid, failed or voided. Use separate attempts/bookings to show different final outcomes. MOCK_ONLINE simulates an immediate result; it never charges a real card. Cancel a future paid booking to demonstrate the backend's simulated refund workflow.

## Member 5 — Maintenance

1. Administrator `/admin/maintenance/new`: choose a vehicle with no protected rental commitments and schedule work.
2. `/admin/maintenance`: search its description and filter by vehicle/status.
3. Open the edit page, update scheduled description/cost/dates, then cancel. To demonstrate start/complete, use a second maintenance record whose interval includes today. A future commitment may block starting even if dates do not overlap. Manual IN_MAINTENANCE vehicle status must be removed separately when appropriate.

## Member 6 — Reviews

1. Complete a paid rental through admin booking controls. The customer can now select it in `/reviews/new` and submit a rating/comment.
2. `/reviews`: view details, edit the review and optionally hide it.
3. Administrator `/admin/reviews`: inspect visible/hidden records and hide an inappropriate visible review. Hiding is permanent soft deletion; it does not allow another review for the same booking.

## Shared screens

Show the dashboards updating from real list responses, the customer notification centre (mark read/dismiss), mobile menu, forbidden route for a customer attempting `/admin`, and the not-found page. The assessment matrix and verification report are in this directory.

## Plain-text storage explanation

Use the [Java storage and no-JSON viva guide](../../docs/no-json/implementation-and-viva.md) to explain BufferedReader, BufferedWriter, Files, Path, the line format and preserved relationships. API calls also use text/plain. Sign in again after upgrading from the old token format.
