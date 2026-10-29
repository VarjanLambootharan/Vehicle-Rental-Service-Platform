import { useState } from "react";
import { Link } from "react-router-dom";
import { bookingsApi, paymentsApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Badge,
  DataTable,
  Field,
  PageHeader,
  ResourceView,
  Select,
  useFeedback,
} from "../../components/common/UI";
import { canCancel, canStart } from "../../utils/rules";
import { date, money, shortId, vehicleName } from "../../utils/format";
export default function Bookings({ admin = false }: { admin?: boolean }) {
  const [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    feedback = useFeedback();
  const resource = useResource(async () => {
    const [bookings, payments, vehicles] = await Promise.all([
      bookingsApi.list(admin),
      paymentsApi.list(admin),
      vehiclesApi.list(),
    ]);
    return { bookings, payments, vehicles };
  }, String(admin));
  return (
    <>
      <PageHeader
        eyebrow="Booking management"
        title={admin ? "Booking management" : "My bookings"}
        description={
          admin
            ? "Manage reservations and the rental lifecycle."
            : "Upcoming drives, favourite memories, and everything in between."
        }
        action={
          !admin && (
            <Link className="btn" to="/bookings/new">
              New reservation →
            </Link>
          )
        }
      />
      <div className="filter-panel compact">
        <Field
          label="Search bookings"
          placeholder="Vehicle or booking reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Booking status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All bookings</option>
          {[
            "CONFIRMED",
            "ACTIVE",
            "COMPLETED",
            "CANCELLATION_PENDING",
            "CANCELLED",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <button className="btn secondary" onClick={resource.reload}>
          Refresh
        </button>
      </div>
      <ResourceView resource={resource}>
        {({ bookings, payments, vehicles }) => (
          <DataTable
            data={bookings
              .filter(
                (b) =>
                  (!status || b.status === status) &&
                  `${b.id} ${vehicleName(b.vehicleId, vehicles)}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
            columns={[
              {
                title: "Reservation",
                render: (b) => (
                  <>
                    <Link
                      className="table-link"
                      to={`${admin ? "/admin" : ""}/bookings/${b.id}`}
                    >
                      {vehicleName(b.vehicleId, vehicles)}
                    </Link>
                    <small className="block muted">#{shortId(b.id)}</small>
                  </>
                ),
              },
              {
                title: "Your dates",
                render: (b) => (
                  <>
                    {date(b.rentalPeriod.pickupDate)}
                    <small className="block muted">
                      to {date(b.rentalPeriod.returnDate)}
                    </small>
                  </>
                ),
              },
              {
                title: "Total",
                render: (b) => money(b.totalAmount, b.currency),
              },
              { title: "Status", render: (b) => <Badge value={b.status} /> },
              {
                title: "Actions",
                render: (b) => (
                  <div className="actions">
                    <Link
                      className="text-link"
                      to={`${admin ? "/admin" : ""}/bookings/${b.id}`}
                    >
                      Details
                    </Link>
                    {admin &&
                      (canStart(b, payments) || b.status === "ACTIVE") && (
                        <button
                          className="text-button"
                          onClick={() =>
                            feedback.confirm({
                              title:
                                b.status === "ACTIVE"
                                  ? "Complete this rental?"
                                  : "Start this rental?",
                              message:
                                "The rental status will be updated after the service validates its payment, dates and availability.",
                              action:
                                b.status === "ACTIVE"
                                  ? "Complete rental"
                                  : "Start rental",
                              run: async () => {
                                await bookingsApi.status(
                                  b.id,
                                  b.status === "ACTIVE"
                                    ? "COMPLETED"
                                    : "ACTIVE",
                                );
                                feedback.toast("Rental status updated.");
                                resource.reload();
                              },
                            })
                          }
                        >
                          {b.status === "ACTIVE" ? "Complete" : "Start rental"}
                        </button>
                      )}
                    {canCancel(b) && (
                      <button
                        className="text-button danger-text"
                        onClick={() =>
                          feedback.confirm({
                            title: "Cancel this reservation?",
                            message:
                              "The booking remains in history. Pending payments are voided and paid payments are refunded through the simulated cancellation workflow.",
                            action:
                              b.status === "CANCELLATION_PENDING"
                                ? "Resume cancellation"
                                : "Cancel booking",
                            run: async () => {
                              const result = await bookingsApi.cancel(b.id);
                              feedback.toast(
                                result.status === "CANCELLATION_PENDING"
                                  ? "Cancellation is processing. Refresh to check its status."
                                  : "Booking cancelled.",
                              );
                              resource.reload();
                            },
                          })
                        }
                      >
                        {b.status === "CANCELLATION_PENDING"
                          ? "Resume cancellation"
                          : "Cancel"}
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </ResourceView>
    </>
  );
}
