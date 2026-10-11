import { useState } from "react";
import { Link } from "react-router-dom";
import { reviewsApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Badge,
  DataTable,
  Details,
  Field,
  PageHeader,
  ResourceView,
  Select,
  useFeedback,
} from "../../components/common/UI";
import { date, shortId, vehicleName } from "../../utils/format";
export default function Reviews({ admin = false }: { admin?: boolean }) {
  const [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    feedback = useFeedback();
  const resource = useResource(async () => {
      const [reviews, vehicles] = await Promise.all([
        admin ? reviewsApi.list() : reviewsApi.mine(),
        vehiclesApi.list(),
      ]);
      return { reviews, vehicles };
    }, String(admin)),
    detail = useResource(
      () => (selected ? reviewsApi.get(selected) : Promise.resolve(null)),
      selected,
    );
  return (
    <>
      <PageHeader
        eyebrow="Reviews & ratings"
        title={admin ? "Review moderation" : "My reviews"}
        description={
          admin
            ? "Inspect and moderate customer reviews. Hidden records remain visible here."
            : "Revisit, edit or hide reviews from your completed journeys."
        }
        action={
          !admin && (
            <Link className="btn" to="/reviews/new">
              Write a review →
            </Link>
          )
        }
      />
      <div className="filter-panel compact">
        <Field
          label="Search reviews"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Vehicle or review text"
        />
        <Select
          label="Visibility"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All reviews</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </Select>
      </div>
      <ResourceView resource={resource}>
        {({ reviews, vehicles }) => (
          <DataTable
            data={reviews.filter(
              (r) =>
                (!status || !!r.deletedAt === (status === "hidden")) &&
                `${r.comment} ${vehicleName(r.vehicleId, vehicles)}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )}
            columns={[
              {
                title: "Journey",
                render: (r) => (
                  <>
                    <strong>{vehicleName(r.vehicleId, vehicles)}</strong>
                    <small className="block muted">
                      Booking #{shortId(r.bookingId)}
                    </small>
                  </>
                ),
              },
              {
                title: "Review",
                render: (r) => (
                  <>
                    <span className="stars" aria-label={`${r.rating} out of 5`}>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    <p className="clamp-text">{r.comment}</p>
                  </>
                ),
              },
              {
                title: "Visibility",
                render: (r) => (
                  <Badge value={r.deletedAt ? "HIDDEN" : "VISIBLE"} />
                ),
              },
              { title: "Date", render: (r) => date(r.createdAt) },
              {
                title: "Actions",
                render: (r) => (
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => setSelected(r.id)}
                    >
                      Details
                    </button>
                    {!r.deletedAt && (
                      <>
                        {!admin && (
                          <Link
                            className="text-link"
                            to={`/reviews/${r.id}/edit`}
                          >
                            Edit
                          </Link>
                        )}
                        <button
                          className="text-button danger-text"
                          onClick={() =>
                            feedback.confirm({
                              title: "Hide this review?",
                              message:
                                "The review will no longer appear publicly. It remains in history and cannot be restored or replaced with a new review for this booking.",
                              action: "Hide review",
                              run: async () => {
                                await reviewsApi.hide(r.id);
                                feedback.toast(
                                  "Review hidden from public view.",
                                );
                                resource.reload();
                                detail.reload();
                              },
                            })
                          }
                        >
                          Hide review
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </ResourceView>
      {selected && (
        <section className="panel section-gap">
          <div className="row-between">
            <h2>Review details</h2>
            <button className="text-button" onClick={() => setSelected("")}>
              Close
            </button>
          </div>
          <ResourceView resource={detail}>
            {(r) =>
              r && (
                <>
                  <p className="stars" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </p>
                  <p className="review-comment">{r.comment}</p>
                  <Details
                    items={[
                      ["Review reference", r.id],
                      ["Booking", r.bookingId],
                      ["Vehicle", r.vehicleId],
                      ["Created", date(r.createdAt)],
                      ["Updated", date(r.updatedAt)],
                      ["Hidden", date(r.deletedAt)],
                    ]}
                  />
                </>
              )
            }
          </ResourceView>
        </section>
      )}
    </>
  );
}
