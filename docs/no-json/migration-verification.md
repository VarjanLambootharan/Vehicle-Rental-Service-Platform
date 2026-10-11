# Verified migration

Date: 2026-10-11

Status: activated

All decoded fields compare equal, including IDs, password hashes, timestamps, decimal amounts, Unicode, nested events, and cancellation state. Java typed reconstruction passed. All primary relationships were checked. No record was regenerated.

Private original archive: `.tools/no-json-originals.zip` (not part of submission).

## Primary counts

- users: 2 before and after
- vehicles: 0 before and after
- bookings: 0 before and after
- payments: 0 before and after
- maintenance: 0 before and after
- reviews: 0 before and after
- notifications: 0 before and after

## File verification (SHA-256)

- data/runtime/backups/users-1791616692168-987111c3-5c02-4d31-8db1-817180215a84.json: 0 records; full decoded equality PASS
  - Original: `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`
- data/runtime/backups/users-1791652617164-658d154d-5b44-4444-a3c6-5751afe8c47e.json: 1 records; full decoded equality PASS
  - Original: `5d5ed1a01f72f0cbbf8f62f784c0861115cbbdb3ebbf40bcaf6926f3d597e82d`
  - Text: `b22c06f4776d241de73fe7f8138b6ccf5bda971957aef9e98ab15374a7ee010e`
- data/runtime/bookings.json: 0 records; full decoded equality PASS
  - Original: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`
- data/runtime/maintenance.json: 0 records; full decoded equality PASS
  - Original: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`
- data/runtime/notifications.json: 0 records; full decoded equality PASS
  - Original: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`
- data/runtime/payments.json: 0 records; full decoded equality PASS
  - Original: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`
- data/runtime/reviews.json: 0 records; full decoded equality PASS
  - Original: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`
- data/runtime/users.json: 2 records; full decoded equality PASS
  - Original: `7df5b5bf5ee23452af24a52f88a56b1548317472c258928be6d5e24fce70a49d`
  - Text: `ba54205d8dd17dd096c59dd3c837444da2f020c9de7d83fe86ae34a5db64e3e2`
- data/runtime/vehicles.json: 0 records; full decoded equality PASS
  - Original: `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`
  - Text: `5ccf85006d3a9f17a33685f6e1aeafe2b8cea58d281de00feaa365a5e5a0a04c`

Both historical user backups were converted separately and retained. Backups are historical snapshots and are not required to form a cross-file snapshot.

The available local dataset contains two users and no rental transactions. Linked transaction coverage is supplied by the automated tests rather than inferred from this dataset.
