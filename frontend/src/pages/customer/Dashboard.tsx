import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CarFront,
  CalendarDays,
  CreditCard,
  MessageSquare,
  Users,
  Wrench,
} from "lucide-react";
import {
  bookingsApi,
  customersApi,
  maintenanceApi,
  notificationsApi,
  paymentsApi,
  reviewsApi,
  vehiclesApi,
} from "../../api/services";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import {
  Badge,
  EmptyState,
  PageHeader,
  ResourceView,
} from "../../components/common/UI";
import { date, label, money, today, vehicleName } from "../../utils/format";
export default function Dashboard({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const resource = useResource(async () => {
    const [
      bookings,
      payments,
      reviews,
      notifications,
      vehicles,
      customers,
      maintenance,
    ] = await Promise.all([
      bookingsApi.list(admin),
      paymentsApi.list(admin),
      admin ? reviewsApi.list() : reviewsApi.mine(),
      notificationsApi.list(),
      vehiclesApi.list(),
      admin ? customersApi.list() : Promise.resolve([]),
      admin ? maintenanceApi.list() : Promise.resolve([]),
    ]);
    return {
      bookings,
      payments,
      reviews,
      notifications,
      vehicles,
      customers,
      maintenance,
    };
  }, String(admin));
  return (
    <>
      <PageHeader
        eyebrow={admin ? "TRAVELER / OVERVIEW" : "MY TRAVELER"}
        title={
          admin
            ? "Admin dashboard"
            : `Welcome, ${user?.fullName.split(" ")[0] || "traveller"}.`
        }
        description={
          admin
            ? "Your rental service, with every detail in view."
            : "Your next journey is closer than you think."
        }
        action={
          <Link
            className="btn"
            to={admin ? "/admin/vehicles/new" : "/vehicles"}
          >
            {admin ? "Add a vehicle" : "Find your next drive"}{" "}
            <ArrowUpRight size={16} />
          </Link>
        }
      />
      <ResourceView resource={resource}>
        {(d) => {
          const upcoming = d.bookings
            .filter(
              (b) =>
                (b.status === "CONFIRMED" &&
                  b.rentalPeriod.pickupDate >= today()) ||
                b.status === "ACTIVE",
            )
            .sort((a, b) =>
              a.rentalPeriod.pickupDate.localeCompare(
                b.rentalPeriod.pickupDate,
              ),
            );
          const prefix = admin ? "/admin" : "";
          const stats = admin
            ? [
                {
                  text: "Customers",
                  count: d.customers.length,
                  to: "/admin/customers",
                  Icon: Users,
                },
                {
                  text: "Vehicles",
                  count: d.vehicles.length,
                  to: "/admin/vehicles",
                  Icon: CarFront,
                },
                {
                  text: "Bookings",
                  count: d.bookings.length,
                  to: "/admin/bookings",
                  Icon: CalendarDays,
                },
                {
                  text: "Payments",
                  count: d.payments.length,
                  to: "/admin/payments",
                  Icon: CreditCard,
                },
                {
                  text: "Maintenance",
                  count: d.maintenance.length,
                  to: "/admin/maintenance",
                  Icon: Wrench,
                },
                {
                  text: "Reviews",
                  count: d.reviews.length,
                  to: "/admin/reviews",
                  Icon: MessageSquare,
                },
              ]
            : [
                {
                  text: "Upcoming & active",
                  count: upcoming.length,
                  to: "/bookings",
                  Icon: CalendarDays,
                },
                {
                  text: "Payment records",
                  count: d.payments.length,
                  to: "/payments",
                  Icon: CreditCard,
                },
                {
                  text: "Your reviews",
                  count: d.reviews.length,
                  to: "/reviews",
                  Icon: MessageSquare,
                },
              ];
          return (
            <>
              <div className="stats-grid">
                {stats.map(({ text, count, to, Icon }) => (
                  <Link className="stat" to={to} key={text}>
                    <Icon size={20} strokeWidth={1.4} />
                    <strong>{count}</strong>
                    <span>
                      {text}
                      <ArrowUpRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="row-between">
                    <h2>
                      {admin
                        ? "Upcoming & active rentals"
                        : "Your upcoming trips"}
                    </h2>
                    <Link className="text-link" to={`${prefix}/bookings`}>
                      View all →
                    </Link>
                  </div>
                  {upcoming.length ? (
                    upcoming.slice(0, 4).map((b) => (
                      <Link
                        className="activity-row"
                        key={b.id}
                        to={`${prefix}/bookings/${b.id}`}
                      >
                        <div>
                          <strong>
                            {vehicleName(b.vehicleId, d.vehicles)}
                          </strong>
                          <small className="block muted">
                            {date(b.rentalPeriod.pickupDate)} —{" "}
                            {date(b.rentalPeriod.returnDate)}
                          </small>
                        </div>
                        <Badge value={b.status} />
                      </Link>
                    ))
                  ) : (
                    <EmptyState
                      description="No upcoming or active rentals."
                      to={admin ? "/admin/bookings" : "/vehicles"}
                    />
                  )}
                </section>
                <section className="panel dark-panel">
                  <span className="eyebrow">
                    {admin
                      ? "Operations at a glance"
                      : "A little room to explore"}
                  </span>
                  <h2>
                    {admin ? (
                      "Keep your fleet moving."
                    ) : (
                      <>
                        Where will the
                        <br />
                        road take you?
                      </>
                    )}
                  </h2>
                  <p>
                    {admin
                      ? "Review reservations and payment outcomes to keep each journey on course."
                      : "A spontaneous escape. A long-awaited visit. The everyday, made a little more memorable."}
                  </p>
                  <Link
                    className="text-link"
                    to={admin ? "/admin/maintenance" : "/vehicles"}
                  >
                    {admin
                      ? "Plan fleet maintenance"
                      : "Explore the collection"}{" "}
                    <ArrowUpRight size={16} />
                  </Link>
                </section>
              </div>
              {admin && (
                <div className="dashboard-grid section-gap">
                  {[
                    { title: "Booking statuses", rows: d.bookings },
                    { title: "Payment statuses", rows: d.payments },
                  ].map((group) => (
                    <section className="panel" key={group.title}>
                      <h2>{group.title}</h2>
                      {[...new Set(group.rows.map((r) => r.status))].map(
                        (status) => (
                          <div className="status-chart-row" key={status}>
                            <div className="row-between">
                              <Badge value={status} />
                              <strong>
                                {
                                  group.rows.filter((r) => r.status === status)
                                    .length
                                }
                              </strong>
                            </div>
                            <div className="status-track">
                              <div
                                style={{
                                  width: `${(group.rows.filter((r) => r.status === status).length / group.rows.length) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                      {!group.rows.length && (
                        <p className="muted">No records yet.</p>
                      )}
                    </section>
                  ))}
                </div>
              )}
              <div className="dashboard-grid section-gap">
                <section className="panel">
                  <div className="row-between">
                    <h2>Recent payment activity</h2>
                    <Link className="text-link" to={`${prefix}/payments`}>
                      View all →
                    </Link>
                  </div>
                  {d.payments.length ? (
                    [...d.payments]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 3)
                      .map((p) => (
                        <Link
                          className="activity-row"
                          to={`${prefix}/payments/${p.id}`}
                          key={p.id}
                        >
                          <div>
                            <strong>{money(p.amount)}</strong>
                            <small className="block muted">
                              {label(p.paymentMethod)} · {date(p.createdAt)}
                            </small>
                          </div>
                          <Badge value={p.status} />
                        </Link>
                      ))
                  ) : (
                    <p className="muted">No payment activity yet.</p>
                  )}
                </section>
                <section className="panel">
                  <div className="row-between">
                    <h2>Latest updates</h2>
                    <Link className="text-link" to="/notifications">
                      View all →
                    </Link>
                  </div>
                  {d.notifications.length ? (
                    d.notifications.slice(0, 3).map((n) => (
                      <div className="activity-row" key={n.id}>
                        <div>
                          <strong>{n.title}</strong>
                          <small className="block muted">
                            {date(n.createdAt)} · {n.read ? "Read" : "Unread"}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="muted">You are all caught up.</p>
                  )}
                  {!admin && (
                    <Link className="text-link" to="/profile">
                      Manage your profile →
                    </Link>
                  )}
                </section>
              </div>
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
