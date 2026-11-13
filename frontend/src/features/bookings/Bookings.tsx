import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { useApi, useAction, useSession } from "../../hooks/useApi";
import {
  Badge,
  Heading,
  QueryState,
  Empty,
  ErrorBox,
  Confirm,
  DeletionModal,
  PaymentState,
  Modal,
  Success,
} from "../../components/ui";
import {
  canEditDates,
  canCancel,
  canPay,
  paymentEligibilityMessage,
  today,
  dateLabel,
  days,
  money,
  dateError,
  categoryFor,
} from "../../utils/domain";
import type { Booking, Payment, User, Vehicle } from "../../types";
import { ApiError, pendingDeletionMessage } from "../../services/api";
export function BookingCard({ booking: b }: { booking: Booking }) {
  return (
    <article className="rental-card">
      <div className="rental-symbol">
        <CalendarDays size={28} />
      </div>
      <div className="rental-info">
        <div className="row">
          <h3>
            {b.vehicleBrand} {b.vehicleModel}
          </h3>
          <Badge value={b.status} />
        </div>
        <p>
          {dateLabel(b.rentalPeriod.pickupDate)} →{" "}
          {dateLabel(b.rentalPeriod.returnDate)}
        </p>
        <small>Booking {b.id.slice(0, 8).toUpperCase()}</small>
      </div>
      <div className="rental-actions">
        <strong>{money(b.totalAmount)}</strong>
        <Link className="text-link" to={"/account/bookings/" + b.id}>
          View booking <ArrowUpRight size={16} />
        </Link>
        {b.vehicleStatus !== "INACTIVE" && (
          <Link
            className="button small secondary"
            to={`/vehicles/${b.vehicleId}?again=1`}
          >
            Book again
          </Link>
        )}
      </div>
    </article>
  );
}
export function BookingList() {
  const q = useApi<Booking[]>("/bookings/me", true, true, true);
  const [filter, setFilter] = useState("all");
  const list = q.data?.filter(
    (b) =>
      filter === "all" ||
      (filter === "upcoming"
        ? ["CONFIRMED", "ACTIVE", "CANCELLATION_PENDING"].includes(b.status)
        : !["CONFIRMED", "ACTIVE", "CANCELLATION_PENDING"].includes(b.status)),
  );
  return (
    <>
      <Heading
        eyebrow="Every journey, in one place"
        title="My bookings"
        action={
          <Link className="button" to="/vehicles">
            Find a vehicle <ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="tabs">
        {["all", "upcoming", "past"].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {x === "all"
              ? "All bookings"
              : x === "upcoming"
                ? "Upcoming & active"
                : "Past rentals"}
          </button>
        ))}
      </div>
      <QueryState query={q}>
        {list?.length ? (
          <div className="stack">
            {list
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
          </div>
        ) : (
          <Empty title="Your next chapter is open">
            <Link className="text-link" to="/vehicles">
              Browse vehicles and plan your first rental →
            </Link>
          </Empty>
        )}
      </QueryState>
    </>
  );
}
export function BookingDetails() {
  const { id } = useParams(),
    session = useSession(),
    admin = session?.user.role === "ADMIN";
  const q = useApi<Booking>("/bookings/" + id, true, true, true),
    payments = useApi<Payment[]>(
      admin ? "/payments" : "/payments/me",
      true,
      true,
      true,
    ),
    customers = useApi<User[]>("/customers", true, admin);
  const action = useAction();
  const [confirm, setConfirm] = useState(""),
    [edit, setEdit] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const b = q.data,
    customer = b
      ? customers.data?.find((entry) => entry.id === b.customerId)
      : undefined,
    related = payments.data?.filter((p) => p.bookingId === id) || [];
  return (
    <>
      <Link
        className="text-link"
        to={admin ? "/admin/bookings" : "/account/bookings"}
      >
        ← All bookings
      </Link>
      <QueryState query={q}>
        {b && (
          <>
            <Heading
              eyebrow={"Booking " + b.id.slice(0, 8).toUpperCase()}
              title={b.vehicleBrand + " " + b.vehicleModel}
              action={<Badge value={b.status} />}
            />
            <div className="detail-layout">
              <div className="panel">
                <h3>Your rental details</h3>
                <dl className="data-list">
                  <dt>Pickup</dt>
                  <dd>{dateLabel(b.rentalPeriod.pickupDate)}</dd>
                  <dt>Return</dt>
                  <dd>{dateLabel(b.rentalPeriod.returnDate)}</dd>
                  <dt>Duration</dt>
                  <dd>
                    {days(b.rentalPeriod.pickupDate, b.rentalPeriod.returnDate)}{" "}
                    days
                  </dd>
                  <dt>Booked daily rate</dt>
                  <dd>{money(b.dailyRateSnapshot)}</dd>
                  <dt>Confirmed total</dt>
                  <dd>
                    <strong>{money(b.totalAmount)}</strong>
                  </dd>
                  <dt>Reference</dt>
                  <dd className="break">{b.id}</dd>
                </dl>
                {admin && (
                  <>
                    <hr />
                    <h3>Booked by</h3>
                    {customers.isPending ? (
                      <p className="muted" role="status">
                        Loading customer details…
                      </p>
                    ) : customer ? (
                      <dl className="data-list">
                        <dt>Customer name</dt>
                        <dd>{customer.fullName}</dd>
                        <dt>Email</dt>
                        <dd className="break">{customer.email}</dd>
                        <dt>Phone</dt>
                        <dd>{customer.phone || "Not recorded"}</dd>
                        <dt>Customer reference</dt>
                        <dd className="break">{customer.id}</dd>
                      </dl>
                    ) : (
                      <div className="notice">
                        <strong>Customer record unavailable</strong>
                        <br />
                        <span className="break">
                          Customer reference: {b.customerId}
                        </span>
                      </div>
                    )}
                    {customers.isError && (
                      <ErrorBox error={customers.error} />
                    )}
                  </>
                )}
                {b.status === "CANCELLATION_PENDING" && (
                  <div className="notice">
                    Cancellation is pending. Payment settlement is not yet
                    confirmed. This page refreshes automatically.
                  </div>
                )}
                <ErrorBox error={error} />
                {success && <Success>{success}</Success>}
                <div className="actions wrap">
                  {!admin && payments.isSuccess && canPay(b, related) && (
                    <Link
                      className="button"
                      to={"/account/bookings/" + id + "/payment"}
                    >
                      Choose payment
                    </Link>
                  )}
                  {!admin && payments.isSuccess && !canPay(b, related) && (
                    <p className="notice">
                      {paymentEligibilityMessage(b, related)}
                    </p>
                  )}
                  {!admin && payments.isSuccess && canEditDates(b, related) && (
                    <button
                      className="button secondary"
                      onClick={() => setEdit(true)}
                    >
                      Change dates
                    </button>
                  )}
                  {canCancel(b) && (
                    <button
                      className="button secondary danger"
                      onClick={() => setConfirm("cancel")}
                    >
                      Cancel booking
                    </button>
                  )}
                  <button
                    className="button secondary danger"
                    onClick={() => setConfirm("delete")}
                  >
                    Permanently delete booking
                  </button>
                  {admin && b.status === "ACTIVE" && (
                    <button
                      className="button"
                      onClick={() => setConfirm("COMPLETED")}
                    >
                      Complete rental
                    </button>
                  )}
                  {admin &&
                    b.status === "CONFIRMED" &&
                    b.rentalPeriod.returnDate <= today() && (
                      <button
                        className="button secondary"
                        onClick={() => setConfirm("NO_SHOW")}
                      >
                        Resolve no-show
                      </button>
                    )}
                  {admin &&
                    b.status === "CONFIRMED" &&
                    b.rentalPeriod.pickupDate <= today() &&
                    b.rentalPeriod.returnDate > today() &&
                    related.some((p) => p.status === "PAID") && (
                      <button
                        className="button"
                        onClick={() => setConfirm("ACTIVE")}
                      >
                        Start rental
                      </button>
                    )}
                </div>
              </div>
              <aside className="panel">
                <h3>Payment details</h3>
                <QueryState query={payments}>
                  {related.length ? (
                    related.map((p) => <PaymentState payment={p} key={p.id} />)
                  ) : (
                    <p>No payment has been recorded for this booking.</p>
                  )}
                </QueryState>
                {!admin && (
                  <>
                    <hr />
                    <h3>Ready for another journey?</h3>
                    {b.vehicleStatus === "INACTIVE" ? (
                      <p>
                        This vehicle is no longer listed.{" "}
                        <Link to="/vehicles">Explore other vehicles.</Link>
                      </p>
                    ) : (
                      <>
                        <p>
                          Choose fresh dates and check today’s rate. This rental
                          stays in your history.
                        </p>
                        <Link
                          className="button secondary full"
                          to={`/vehicles/${b.vehicleId}?again=1`}
                        >
                          Book again <ArrowUpRight size={18} />
                        </Link>
                      </>
                    )}
                  </>
                )}
              </aside>
            </div>
            {confirm === "delete" ? (
              <DeletionModal
                kind="BOOKING"
                targetId={b.id}
                title={`Permanently delete booking ${b.id.slice(0, 8).toUpperCase()}?`}
                reasons={admin ? ["ADMIN_CORRECTION", "VEHICLE_UNAVAILABLE", "CUSTOMER_REQUEST", "OTHER"] : ["CUSTOMER_REQUEST", "OTHER"]}
                onClose={() => setConfirm("")}
                onCompleted={(result) => setSuccess(pendingDeletionMessage(result) || "Deletion completed. The receipt remains available from your settlements.")}
              />
            ) : confirm && (
              <Confirm
                title={
                  confirm === "cancel"
                      ? "Cancel this booking?"
                    : confirm === "ACTIVE"
                      ? "Start this rental?"
                      : confirm === "NO_SHOW"
                        ? "Resolve as no-show?"
                        : "Complete this rental?"
                }
                pending={action.isPending}
                error={action.error}
                confirmLabel="Confirm"
                onClose={() => setConfirm("")}
                onConfirm={async () => {
                  try {
                    const result = await action.mutateAsync({
                      path:
                        "/bookings/" +
                        id +
                        (confirm === "cancel"
                            ? "/cancel"
                            : "/status"),
                      method: "PATCH",
                      ...(confirm === "cancel"
                          ? {}
                          : { body: { status: confirm } }),
                    });
                    setConfirm("");
                    setSuccess(
                      (confirm === "cancel" &&
                      (result as Booking | undefined)?.status ===
                        "CANCELLATION_PENDING"
                        ? "Cancellation is pending. This page refreshes automatically while settlement is completed."
                        : null) ||
                        pendingDeletionMessage(result) ||
                        "The latest booking and payment states have been refreshed.",
                    );
                  } catch {
                    /* error stays in dialog; queries reconcile current state */
                  }
                }}
              >
                {confirm === "cancel"
                  ? "Cancellation keeps the booking in your history. A pending cash payment is voided and a recorded payment receives only a simulated refund. No real money is transferred."
                  : "The server will validate the rental transition before saving it."}
              </Confirm>
            )}
            {edit && (
              <Modal title="Change rental dates" onClose={() => setEdit(false)}>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget),
                      pickupDate = String(f.get("pickupDate")),
                      returnDate = String(f.get("returnDate"));
                    const err = dateError(pickupDate, returnDate);
                    setError(err);
                    if (err) return;
                    try {
                      await action.mutateAsync({
                        path: "/bookings/" + id,
                        method: "PUT",
                        body: { pickupDate, returnDate },
                      });
                      setEdit(false);
                      setSuccess("Your rental dates have been updated.");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <label>
                    Pickup date
                    <input
                      type="date"
                      name="pickupDate"
                      required
                      min={today()}
                      defaultValue={b.rentalPeriod.pickupDate}
                    />
                  </label>
                  <label>
                    Return date
                    <input
                      type="date"
                      name="returnDate"
                      required
                      min={today()}
                      defaultValue={b.rentalPeriod.returnDate}
                    />
                  </label>
                  <p>The original booked daily rate is retained.</p>
                  <ErrorBox error={error} />
                  <button className="button" disabled={action.isPending}>
                    Save dates
                  </button>
                </form>
              </Modal>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
export function Checkout() {
  const { id } = useParams(),
    q = useApi<Booking>("/bookings/" + id, true),
    payments = useApi<Payment[]>("/payments/me", true);
  const vehicle = useApi<Vehicle>(
    "/vehicles/" + (q.data?.vehicleId || ""),
    false,
    !!q.data,
  );
  const action = useAction<Payment>();
  const [method, setMethod] = useState<"MOCK_ONLINE" | "CASH_ON_PICKUP">(
      "MOCK_ONLINE",
    ),
    [result, setResult] = useState<Payment | null>(null),
    [uncertain, setUncertain] = useState(false);
  const paymentEligible =
    !!q.data && payments.isSuccess && canPay(q.data, payments.data || []);
  const paymentUnavailableMessage =
    q.data && payments.isSuccess && !paymentEligible
      ? paymentEligibilityMessage(q.data, payments.data || [])
      : "";
  return (
    <>
      <Link className="text-link" to={"/account/bookings/" + id}>
        ← Booking details
      </Link>
      <Heading eyebrow="One step closer" title="Make your journey official." />
      <QueryState query={q}>
        {q.data && (
          <div className="checkout-layout">
            <section className="panel">
              <h3>Choose your payment method</h3>
              <p>All online transactions are educational simulations.</p>
              <label
                className={
                  "payment-option " +
                  (method === "MOCK_ONLINE" ? "selected" : "")
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={method === "MOCK_ONLINE"}
                  disabled={
                    payments.isSuccess && (!paymentEligible || !!result)
                  }
                  onChange={() => setMethod("MOCK_ONLINE")}
                />
                <span>
                  <strong>Demo Card Payment</strong>
                  <small>
                    Simulated online payment. No card details required.
                  </small>
                </span>
              </label>
              <div className="demo-card">
                <span>
                  DRIVELINK <small>DEMO</small>
                </span>
                <div className="card-chip">▦</div>
                <strong>YOUR NEXT JOURNEY</strong>
                <span>
                  SIMULATION ONLY <span>◉ ◉</span>
                </span>
              </div>
              <label
                className={
                  "payment-option " +
                  (method === "CASH_ON_PICKUP" ? "selected" : "")
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={method === "CASH_ON_PICKUP"}
                  disabled={
                    payments.isSuccess && (!paymentEligible || !!result)
                  }
                  onChange={() => setMethod("CASH_ON_PICKUP")}
                />
                <span>
                  <strong>Cash on Pickup</strong>
                  <small>
                    Recorded as pending until an administrator resolves it.
                  </small>
                </span>
              </label>
              <QueryState query={payments}>
                {paymentEligible && !result && (
                  <button
                    className="button full"
                    disabled={action.isPending || uncertain}
                    onClick={async () => {
                      try {
                        setResult(
                          await action.mutateAsync({
                            path: "/payments",
                            method: "POST",
                            body: { bookingId: id, paymentMethod: method },
                          }),
                        );
                      } catch (e) {
                        if (e instanceof ApiError && e.uncertain)
                          setUncertain(true);
                      }
                    }}
                  >
                    {action.isPending
                      ? "Processing…"
                      : method === "MOCK_ONLINE"
                        ? "Confirm demo payment"
                        : "Confirm cash on pickup"}
                  </button>
                )}
                {paymentUnavailableMessage && !result && (
                  <div className="notice" role="status">
                    {paymentUnavailableMessage}
                  </div>
                )}
                {(result
                  ? [result]
                  : payments.data?.filter((p) => p.bookingId === id) || []
                ).map((p) => (
                  <PaymentState key={p.id} payment={p} />
                ))}
              </QueryState>
              <ErrorBox error={action.error} />
              {uncertain && (
                <div className="notice">
                  The result is uncertain.{" "}
                  <Link to={"/account/bookings/" + id}>
                    Check the booking’s current payment state
                  </Link>{" "}
                  before submitting again.
                </div>
              )}
              {result?.status === "FAILED" && (
                <button
                  className="button secondary"
                  onClick={() => setResult(null)}
                >
                  Choose payment again
                </button>
              )}
            </section>
            <aside className="panel order-summary">
              <span className="eyebrow">
                Your journey at a glance
                {vehicle.data
                  ? " · " + categoryFor(vehicle.data.type).singular
                  : ""}
              </span>
              <h2>
                {q.data.vehicleBrand} {q.data.vehicleModel}
              </h2>
              <Badge value={q.data.status} />
              <dl className="data-list">
                <dt>Pickup</dt>
                <dd>{dateLabel(q.data.rentalPeriod.pickupDate)}</dd>
                <dt>Return</dt>
                <dd>{dateLabel(q.data.rentalPeriod.returnDate)}</dd>
                <dt>Duration</dt>
                <dd>
                  {days(
                    q.data.rentalPeriod.pickupDate,
                    q.data.rentalPeriod.returnDate,
                  )}{" "}
                  days
                </dd>
                <dt>Reference</dt>
                <dd>{q.data.id.slice(0, 8).toUpperCase()}</dd>
              </dl>
              <div className="total">
                <span>Confirmed total</span>
                <h2>{money(q.data.totalAmount)}</h2>
              </div>
              <p>No real bank charge will be made.</p>
              <Link className="text-link" to={"/account/bookings/" + id}>
                View booking details →
              </Link>
            </aside>
          </div>
        )}
      </QueryState>
    </>
  );
}
