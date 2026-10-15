import { Link, useParams } from "react-router-dom";
import { vehiclesApi, reviewsApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import {
  Badge,
  Details,
  EmptyState,
  PageHeader,
  ResourceView,
} from "../../components/common/UI";
import { VehicleImage } from "../../components/vehicles/VehicleCard";
import { date, money } from "../../utils/format";
export default function VehicleDetails() {
  const { id = "" } = useParams(),
    { user } = useAuth();
  const vehicle = useResource(() => vehiclesApi.get(id), id),
    reviews = useResource(() => reviewsApi.list(id), id);
  return (
    <div className="wrap public-page">
      <Link className="text-link" to="/vehicles">
        ← Back to the collection
      </Link>
      <ResourceView resource={vehicle}>
        {(v) => (
          <>
            <PageHeader
              eyebrow="The collection / In detail"
              title={`${v.brand} ${v.model}`}
              action={<Badge value={v.status} />}
            />
            <div className="detail-layout">
              <div className="detail-photo">
                <VehicleImage vehicle={v} />
              </div>
              <section className="panel">
                <span className="eyebrow">Your journey begins here</span>
                <h2>
                  {money(v.dailyRate)} <small>/ day</small>
                </h2>
                <p>
                  {v.description ||
                    "Explore the specifications for this vehicle below."}
                </p>
                <Details
                  items={[
                    ["Vehicle type", v.type === "CAR" ? "Car" : "Motorcycle"],
                    ["Passengers", v.passengerCapacity],
                    [
                      v.type === "CAR" ? "Transmission" : "Engine capacity",
                      v.type === "CAR"
                        ? v.transmission
                        : `${v.engineCapacityCc} cc`,
                    ],
                    ["Registration", v.registrationNumber],
                  ]}
                />
                <p className="notice">{v.rentalGuidance}</p>
                {user?.role === "ADMIN" ? (
                  <Link className="btn" to={`/admin/vehicles/${v.id}/edit`}>
                    Manage this vehicle
                  </Link>
                ) : v.status === "AVAILABLE" ? (
                  <Link className="btn" to={`/bookings/new?vehicleId=${v.id}`}>
                    Choose your dates →
                  </Link>
                ) : (
                  <p>
                    This vehicle is currently unavailable for new reservations.
                  </p>
                )}
                <p className="muted small-text">
                  Final availability is checked for your selected dates.
                </p>
              </section>
            </div>
          </>
        )}
      </ResourceView>
      <section className="section">
        <PageHeader eyebrow="From the open road" title="Reviews and ratings" />
        <ResourceView resource={reviews}>
          {(rows) =>
            rows.filter((r) => !r.deletedAt).length ? (
              <div className="review-grid">
                {rows
                  .filter((r) => !r.deletedAt)
                  .map((r) => (
                    <article className="panel" key={r.id}>
                      <span
                        className="stars"
                        aria-label={`${r.rating} out of 5 stars`}
                      >
                        {"★".repeat(r.rating)}
                        {"☆".repeat(5 - r.rating)}
                      </span>
                      <p>{r.comment}</p>
                      <small className="muted">
                        Completed rental · {date(r.createdAt)}
                      </small>
                    </article>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="The first story is still to come."
                description="Reviews appear here after a completed rental."
              />
            )
          }
        </ResourceView>
      </section>
    </div>
  );
}
