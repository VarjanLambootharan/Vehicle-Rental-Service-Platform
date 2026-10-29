import { Link, useParams } from "react-router-dom";
import { bookingsApi, paymentsApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import {
  Badge,
  Details,
  Field,
  Form,
  PageHeader,
  ResourceView,
  Submit,
  useFeedback,
  value,
} from "../../components/common/UI";
import { canCancel, canEditBooking, canPay } from "../../utils/rules";
import { date, money, shortId, today, vehicleName } from "../../utils/format";
export default function BookingDetails() {
  const { id = "" } = useParams(),
    { user } = useAuth(),
    feedback = useFeedback(),
    admin = user?.role === "ADMIN";
  const resource = useResource(async () => {
    const [booking, payments, vehicles] = await Promise.all([
      bookingsApi.get(id),
      paymentsApi.list(admin),
      vehiclesApi.list(),
    ]);
    return { booking, payments, vehicles };
  }, id);
  return (
    <>
      <PageHeader
        eyebrow="Booking management"
        title="Booking details"
        action={
          <Link
            className="btn secondary"
            to={admin ? "/admin/bookings" : "/bookings"}
          >
            All bookings
          </Link>
        }
      />
      <ResourceView resource={resource}>
        {({ booking: b, payments, vehicles }) => (
          <>
            <section className="panel">
              <div className="row-between">
                <h2>{vehicleName(b.vehicleId, vehicles)}</h2>
                <Badge value={b.status} />
              </div>
              <Details
                items={[
                  ["Booking reference", b.id],
                  ["Pick-up", date(b.rentalPeriod.pickupDate)],
                  ["Return (exclusive)", date(b.rentalPeriod.returnDate)],
                  ["Saved daily rate", money(b.dailyRateSnapshot)],
                  ["Confirmed total", money(b.totalAmount, b.currency)],
                  ["Created", date(b.createdAt)],
                  ["Cancelled", date(b.cancelledAt)],
                  ...(admin
                    ? [["Customer reference", b.customerId] as [string, string]]
                    : []),
                ]}
              />
              <div className="actions">
                {!admin && canPay(b, payments) && (
                  <Link className="btn" to={`/payments/new?bookingId=${b.id}`}>
                    Continue to payment
                  </Link>
                )}
                {!admin && b.status === "COMPLETED" && (
                  <Link
                    className="btn secondary"
                    to={`/reviews/new?bookingId=${b.id}`}
                  >
                    Review this journey
                  </Link>
                )}
                {canCancel(b) && (
                  <button
                    className="btn secondary danger"
                    onClick={() =>
                      feedback.confirm({
                        title: "Cancel this booking?",
                        message:
                          "This cancels the reservation and settles related simulated payments. The booking record is retained.",
                        action:
                          b.status === "CANCELLATION_PENDING"
                            ? "Resume cancellation"
                            : "Cancel booking",
                        run: async () => {
                          const result = await bookingsApi.cancel(id);
                          feedback.toast(
                            result.status === "CANCELLATION_PENDING"
                              ? "Cancellation is processing; refresh to check again."
                              : "Booking cancelled.",
                          );
                          resource.reload();
                        },
                      })
                    }
                  >
                    {b.status === "CANCELLATION_PENDING"
                      ? "Resume cancellation"
                      : "Cancel booking"}
                  </button>
                )}
                <button className="btn secondary" onClick={resource.reload}>
                  Refresh status
                </button>
              </div>
              {b.status === "CANCELLATION_PENDING" && (
                <p className="notice">
                  Cancellation has been saved and is still processing. Your
                  booking remains protected until the service finishes. Refresh
                  or resume the cancellation.
                </p>
              )}
            </section>
            {!admin && canEditBooking(b, payments) && (
              <section className="section-gap">
                <h2>Adjust your dates</h2>
                <Form
                  key={b.updatedAt}
                  onSave={async (f) => {
                    const pickupDate = value(f, "pickupDate"),
                      returnDate = value(f, "returnDate");
                    if (returnDate <= pickupDate)
                      throw new Error("Return must be after pickup.");
                    await bookingsApi.update(id, { pickupDate, returnDate });
                    feedback.toast("Booking dates updated.");
                    resource.reload();
                  }}
                >
                  {(busy) => (
                    <>
                      <Field
                        label="Pick-up date"
                        name="pickupDate"
                        type="date"
                        required
                        min={today()}
                        defaultValue={b.rentalPeriod.pickupDate}
                      />
                      <Field
                        label="Return date"
                        name="returnDate"
                        type="date"
                        required
                        min={today()}
                        defaultValue={b.rentalPeriod.returnDate}
                      />
                      <div className="full">
                        <Submit busy={busy}>Save dates</Submit>
                      </div>
                    </>
                  )}
                </Form>
              </section>
            )}
            <section className="panel section-gap">
              <h2>Payment activity</h2>
              {payments.filter((p) => p.bookingId === id).length ? (
                payments
                  .filter((p) => p.bookingId === id)
                  .map((p) => (
                    <div className="activity-row" key={p.id}>
                      <Link to={`${admin ? "/admin" : ""}/payments/${p.id}`}>
                        Payment #{shortId(p.id)}
                      </Link>
                      <span>{money(p.amount)}</span>
                      <Badge value={p.status} />
                    </div>
                  ))
              ) : (
                <p>No payment attempts have been recorded.</p>
              )}
            </section>
          </>
        )}
      </ResourceView>
    </>
  );
}
