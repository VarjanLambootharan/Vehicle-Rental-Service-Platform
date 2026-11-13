import { useState } from "react";
import { useApi, useAction } from "../../hooks/useApi";
import { pendingDeletionMessage } from "../../services/api";
import {
  Heading,
  QueryState,
  Empty,
  Badge,
  Modal,
  ErrorBox,
  Confirm,
  DeletionModal,
} from "../../components/ui";
import type { Booking, Review } from "../../types";
export function ReviewsManager({ admin = false }: { admin?: boolean }) {
  const q = useApi<Review[]>(admin ? "/reviews" : "/reviews/me", true),
    bookings = useApi<Booking[]>("/bookings/me", true, !admin),
    action = useAction();
  const [editing, setEditing] = useState<Review | Booking | null>(null),
    [remove, setRemove] = useState<Review | null>(null),
    [hide, setHide] = useState<Review | null>(null),
    [deletionPending, setDeletionPending] = useState("");
  const eligible = bookings.data?.filter(
    (b) =>
      b.status === "COMPLETED" && !q.data?.some((r) => r.bookingId === b.id),
  );
  return (
    <>
      <Heading
        title={admin ? "Review moderation" : "My reviews"}
        eyebrow={
          admin
            ? "Keep the conversation useful"
            : "Tell the story of your journey"
        }
      />
      {deletionPending && <div className="notice">{deletionPending}</div>}
      {!admin &&
        q.isSuccess &&
        eligible?.map((b) => (
          <div className="panel row" key={b.id}>
            <div>
              <h3>
                {b.vehicleBrand} {b.vehicleModel}
              </h3>
              <p>Your completed rental is ready for a review.</p>
            </div>
            <button className="button small" onClick={() => setEditing(b)}>
              Write a review
            </button>
          </div>
        ))}
      <QueryState query={q}>
        {q.data?.length ? (
          <div className="grid two">
            {q.data.map((r) => (
              <article className="panel" key={r.id}>
                <div className="row">
                  <span className="stars">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                  <Badge value={r.deletedAt ? "HIDDEN" : "VISIBLE"} />
                </div>
                <p>{r.comment}</p>
                <small className="break">Booking {r.bookingId}</small>
                <div className="actions">
                  {!admin && !r.deletedAt && (
                    <button
                      className="button secondary small"
                      onClick={() => setEditing(r)}
                    >
                      Edit review
                    </button>
                  )}
                  {admin && !r.deletedAt && (
                    <button
                      className="text-button"
                      onClick={() => setHide(r)}
                    >
                      Hide review
                    </button>
                  )}
                  <button
                    className="text-button danger"
                    onClick={() => setRemove(r)}
                  >
                    Permanently delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="No reviews yet">
            Reviews can be submitted after a rental is completed.
          </Empty>
        )}
      </QueryState>
      {editing && (
        <Modal
          title={
            "rating" in editing ? "Edit your review" : "How was your journey?"
          }
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                body = {
                  rating: Number(f.get("rating")),
                  comment: String(f.get("comment")).trim(),
                };
              try {
                await action.mutateAsync(
                  "rating" in editing
                    ? { path: "/reviews/" + editing.id, method: "PUT", body }
                    : {
                        path: "/reviews",
                        method: "POST",
                        body: {
                          ...body,
                          bookingId: editing.id,
                          vehicleId: editing.vehicleId,
                        },
                      },
                );
                setEditing(null);
              } catch {
                /* retain form */
              }
            }}
          >
            <label>
              Rating
              <select
                name="rating"
                defaultValue={"rating" in editing ? editing.rating : 5}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your review
              <textarea
                name="comment"
                required
                maxLength={2000}
                defaultValue={"rating" in editing ? editing.comment : ""}
              />
            </label>
            <p>One review per booking, including hidden reviews.</p>
            <ErrorBox error={action.error} />
            <button className="button" disabled={action.isPending}>
              Save review
            </button>
          </form>
        </Modal>
      )}
      {remove && (
        <DeletionModal
          kind="REVIEW"
          targetId={remove.id}
          title={`Permanently delete review for booking ${remove.bookingId.slice(0, 8).toUpperCase()}?`}
          reasons={admin ? ["POLICY_VIOLATION", "DUPLICATE", "OTHER"] : ["OTHER"]}
          onClose={() => setRemove(null)}
          onCompleted={(result) => setDeletionPending(pendingDeletionMessage(result) || "Deletion completed. The recipient can access its receipt when authorised.")}
        />
      )}
      {hide && (
        <Confirm
          title={`Hide review for booking ${hide.bookingId.slice(0, 8).toUpperCase()}?`}
          pending={action.isPending}
          error={action.error}
          confirmLabel="Hide review"
          onClose={() => setHide(null)}
          onConfirm={async () => {
            try {
              await action.mutateAsync({
                path: "/reviews/" + hide.id + "/hide",
                method: "PATCH",
              });
              setHide(null);
            } catch {
              /* ErrorBox in the dialog keeps the backend message visible. */
            }
          }}
        >
          Hidden reviews remain in the administrator and customer history, are excluded from public listings, and still count as the booking's one review.
        </Confirm>
      )}
    </>
  );
}
