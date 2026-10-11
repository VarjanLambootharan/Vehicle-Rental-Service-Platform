# File persistence and recovery

## Seven primary files

`users.txt` stores Customer/Admin polymorphic records and BCrypt password hashes. `vehicles.txt` stores Car/Motorcycle polymorphic records. `bookings.txt` stores UUID associations, a nested rental period, immutable rate snapshot, current total, cancellation intent and booking events. `payments.txt` stores attempts, amounts, status, processed workflow ID, simulated refund reference and payment events. `maintenance.txt` stores vehicle IDs and service intervals. `reviews.txt` stores reviews, deletion timestamps and review events. `notifications.txt` stores delivered event IDs, read timestamps and dismissal tombstones.

There is no catalogue file, event-queue file, database or in-memory-only business store. Temporary replacement files and backup copies are auxiliary storage, not primary business files. The two resource seed files are `users.txt` and `vehicles.txt`, both initially a `TRAVELER-TEXT-1` header followed by `list<TAB>0`. Seeds are used only if the corresponding runtime file does not exist. Later restarts preserve records.

## Protected writes

Every repository delegates to `TextFileStore`. `StorageCoordinator` supplies one fair, reentrant, application-wide lock. Services hold it while validating references, checking competing bookings/payments/maintenance and persisting the decision. Repository updates read the latest file and replace one record by UUID under the same lock. Returned objects are deserialized copies, so modifying an object does not change disk until `save` succeeds.

The writer serializes UTF-8 tagged text, writes a temporary file in the same directory, flushes it through `FileChannel.force(true)`, backs up the previous primary file, and replaces the primary using `ATOMIC_MOVE` and `REPLACE_EXISTING`. If the filesystem cannot perform atomic replacement, the operation fails explicitly; it does not fall back to a partial overwrite. Temporary files are removed on normal failure. Each file retains at most five backups under `backups/`. A terminated process may leave an orphan `.tmp` file; it is never read as business data.

Backups preserve earlier contents, including password hashes and customer details. Apply the same operating-system access controls to the whole runtime directory. Hashes are excluded from API DTOs but must remain in the private user store for authentication.

Malformed text, unknown subtypes, missing required fields, duplicate record IDs and invalid typed values fail rather than silently replacing data. Startup forces typed reads of all seven files. Never replace a corrupt file with an empty list to make an error disappear.

## Recoverable cancellation

1. Under the shared lock, verify ownership/admin access, a CONFIRMED booking and a pickup date strictly after the current business date. Find the single current PENDING or PAID payment. Reject multiple current payments.
2. Save `CANCELLATION_PENDING` and a nested `CancellationWorkflow` in the booking. It includes workflow ID, booking ID, payment ID/amount where applicable, requested timestamp, required NONE/VOID/REFUND action and REQUESTED state. The booking still blocks its dates.
3. Save the payment operation. PENDING becomes VOIDED. PAID becomes REFUNDED and receives `refundedAt`, `processedWorkflowId` and `SIM-<workflowId>`. The original amount remains unchanged. A retry matching the processed workflow skips a second payment write.
4. Save CANCELLED, `cancelledAt`, a COMPLETED workflow, and one cancellation event together in the booking. Only this committed state releases the dates.
5. Deliver the saved event to notifications. The refund message uses the stored payment amount and the referenced vehicle's brand/model. It explicitly states that no real money was transferred.

If the initial intent cannot be saved, the request fails with 503 and no payment mutation occurs. If intent exists but later storage fails, DELETE returns 202 with CANCELLATION_PENDING and the workflow ID. The caller may poll GET or retry DELETE. A repeated pending request resumes its existing workflow; a repeated completed cancellation returns the completed booking without repeating the refund.

`RecoveryRunner` resumes pending cancellations at startup and every 30 seconds. Permanent integrity conflicts remain pending and are logged for operator attention; dates remain blocked. This is a recoverable sequence of separate writes, **not a database transaction across files**.

## Persistent notifications

Booking, Payment and Review extend `EventEntity`. Each state-changing operation appends its notification event to that source record before the record is saved. A PENDING payment generates a pending-payment message, never a successful-payment message.

`NotificationService.deliverPending()` reads persisted events, checks the event IDs in `notifications.txt`, and saves only missing notifications under the shared lock. Delivery runs after relevant business operations and during startup/periodic recovery. A notification write failure is logged and does not reverse the successful business operation; the originating event remains available for retry.

DELETE records `dismissedAt`. The event ID and notification record remain permanently stored. Ordinary lists and unread counts exclude dismissed records. Replaying events after a restart therefore cannot recreate them. Read status and dismissal are independent. Mark-all and dismiss-all are idempotent per record; interruption can leave a partially processed collection, so retry the same operation.

## Explicit administrator and backup recovery

1. Stop the only running application instance. Do not edit files while it is running.
2. Copy the entire runtime directory to a separate private recovery location before attempting repair. Keep all seven primary files together.
3. For a damaged file, inspect its backups and identify a known valid copy. Restore that file only after checking related IDs and cancellation workflow/payment consistency against the other files. Per-file backups are not coordinated snapshots of all seven files.
4. If existing users have no administrator, restore a known valid `users.txt` backup containing an active Admin and the retained customer accounts. Do not discard customers or manually promote a public registration request. If no such backup exists, stop and perform an explicitly reviewed offline repair with a valid BCrypt hash and UUID preservation; there is intentionally no unauthenticated recovery API.
5. Restart and inspect recovery messages. Verify pending bookings, payment workflow IDs and notifications before admitting normal traffic.

Atomic replacement protects individual files, while logical workflows handle application crashes between files. Hardware/filesystem power-loss behavior and directory-entry durability remain platform-dependent. The project supports one JVM instance on a local filesystem that implements atomic replacement; there is no distributed lock or support for concurrent external file editing.

## Migration and viva documentation

See [the implementation guide](no-json/implementation-and-viva.md) and [verified migration](no-json/migration-verification.md). The runtime deliberately refuses legacy business files. Do not rename a legacy JSON file to .txt; its actual contents must be converted offline.
