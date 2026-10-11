import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { bookingsApi, reviewsApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  EmptyState,
  Form,
  PageHeader,
  ResourceView,
  Select,
  Submit,
  Textarea,
  useFeedback,
  value,
} from "../../components/common/UI";
import { date, shortId, vehicleName } from "../../utils/format";
export default function ReviewForm() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    [selected, setSelected] = useState(params.get("bookingId") || ""),
    navigate = useNavigate(),
    feedback = useFeedback();
  const resource = useResource(async () => {
    const [bookings, reviews, vehicles, review] = await Promise.all([
      bookingsApi.list(),
      reviewsApi.mine(),
      vehiclesApi.list(),
      id ? reviewsApi.get(id) : Promise.resolve(null),
    ]);
    return { bookings, reviews, vehicles, review };
  }, id || "new");
  return (
    <>
      <PageHeader
        eyebrow="Reviews & ratings"
        title={id ? "Edit review" : "Write a review"}
        description="Share an honest reflection on your completed rental."
        action={
          <Link className="btn secondary" to="/reviews">
            My reviews
          </Link>
        }
      />
      <ResourceView resource={resource}>
        {({ bookings, reviews, vehicles, review }) => {
          const eligible = bookings.filter(
            (b) =>
              b.status === "COMPLETED" &&
              !reviews.some((r) => r.bookingId === b.id),
          );
          if (review?.deletedAt)
            return (
              <EmptyState
                title="This review has been hidden."
                description="Hidden reviews cannot be edited or restored."
              />
            );
          if (!id && !eligible.length)
            return (
              <EmptyState
                title="More stories ahead."
                description="Complete a rental to leave a review. Each booking can have one review, even if it has been hidden."
                to="/bookings"
                action="View bookings"
              />
            );
          if (id && !reviews.some((r) => r.id === id))
            return (
              <EmptyState
                title="This is not your review."
                description="Only the customer who submitted a review can edit it."
              />
            );
          return (
            <Form
              key={review?.updatedAt || "new"}
              onSave={async (f) => {
                const body = {
                  rating: Number(value(f, "rating")),
                  comment: value(f, "comment"),
                };
                if (review) await reviewsApi.update(review.id, body);
                else {
                  const booking = eligible.find((b) => b.id === selected);
                  if (!booking)
                    throw new Error("Select an eligible completed booking.");
                  await reviewsApi.create({
                    ...body,
                    bookingId: booking.id,
                    vehicleId: booking.vehicleId,
                  });
                }
                feedback.toast(
                  review
                    ? "Your review has been updated."
                    : "Thank you for sharing your experience.",
                );
                navigate("/reviews");
              }}
            >
              {(busy) => (
                <>
                  {!review ? (
                    <div className="full">
                      <Select
                        label="Completed journey"
                        required
                        value={
                          eligible.some((b) => b.id === selected)
                            ? selected
                            : ""
                        }
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        <option value="">Choose a completed rental</option>
                        {eligible.map((b) => (
                          <option value={b.id} key={b.id}>
                            {vehicleName(b.vehicleId, vehicles)} ·{" "}
                            {date(b.rentalPeriod.pickupDate)} · #{shortId(b.id)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <div className="full">
                      <h2>{vehicleName(review.vehicleId, vehicles)}</h2>
                      <p className="muted">
                        Booking #{shortId(review.bookingId)}
                      </p>
                    </div>
                  )}
                  <Select
                    label="Your rating"
                    name="rating"
                    required
                    defaultValue={review?.rating || ""}
                  >
                    <option value="">Choose a rating</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)} · {n} out of 5
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    label="Your experience"
                    name="comment"
                    required
                    maxLength={2000}
                    rows={6}
                    defaultValue={review?.comment}
                    placeholder="What made this journey memorable?"
                  />
                  <div className="full">
                    <Submit busy={busy}>
                      {review ? "Save review" : "Share your experience"}
                    </Submit>
                  </div>
                </>
              )}
            </Form>
          );
        }}
      </ResourceView>
    </>
  );
}
