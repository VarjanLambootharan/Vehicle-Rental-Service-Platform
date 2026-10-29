import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { bookingsApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Field,
  Form,
  PageHeader,
  ResourceView,
  Select,
  Submit,
  useFeedback,
  value,
} from "../../components/common/UI";
import { afterDate, money, rentalDays, today } from "../../utils/format";
export default function CreateBooking() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    feedback = useFeedback();
  const [pickup, setPickup] = useState(params.get("pickupDate") || today()),
    [returned, setReturned] = useState(
      params.get("returnDate") || afterDate(today()),
    ),
    [vehicleId, setVehicleId] = useState(params.get("vehicleId") || "");
  const valid = pickup >= today() && returned > pickup;
  const resource = useResource(
    () =>
      valid
        ? vehiclesApi.list({ pickupDate: pickup, returnDate: returned })
        : Promise.resolve([]),
    `${pickup}|${returned}|${valid}`,
  );
  const selected = resource.data?.find((v) => v.id === vehicleId);
  return (
    <>
      <PageHeader
        eyebrow="Booking management"
        title="Book a vehicle"
        description="Choose your dates. We will check the collection for availability."
        action={
          <Link className="btn secondary" to="/bookings">
            My bookings
          </Link>
        }
      />
      <div className="detail-layout">
        <Form
          onSave={async (f) => {
            if (!selected || !valid)
              throw new Error(
                "Select an available vehicle and valid rental dates.",
              );
            const b = await bookingsApi.create({
              vehicleId: selected.id,
              pickupDate: value(f, "pickupDate"),
              returnDate: value(f, "returnDate"),
            });
            feedback.toast("Your booking is confirmed.");
            navigate(`/payments/new?bookingId=${b.id}`);
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
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
              <Field
                label="Return date"
                name="returnDate"
                type="date"
                required
                min={pickup ? afterDate(pickup) : today()}
                value={returned}
                onChange={(e) => setReturned(e.target.value)}
              />
              <div className="full">
                <ResourceView resource={resource}>
                  {(vehicles) => (
                    <>
                      <Select
                        label="Available vehicle"
                        required
                        value={selected ? vehicleId : ""}
                        onChange={(e) => setVehicleId(e.target.value)}
                      >
                        <option value="">Select a vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.brand} {v.model} · {money(v.dailyRate)} / day
                          </option>
                        ))}
                      </Select>
                      {!vehicles.length && (
                        <p className="notice">
                          No vehicles are available for these dates. Try another
                          interval or check the collection.
                        </p>
                      )}
                    </>
                  )}
                </ResourceView>
              </div>
              <p className="full muted small-text">
                Return date is exclusive. All dates use the rental service’s
                business timezone.
              </p>
              <div className="full">
                {selected && valid ? (
                  <Submit busy={busy}>Confirm reservation</Submit>
                ) : (
                  <button className="btn" disabled>
                    Select an available vehicle
                  </button>
                )}
              </div>
            </>
          )}
        </Form>
        <aside className="panel summary-panel">
          <span className="eyebrow">A considered reservation</span>
          <h2>
            Your journey,
            <br />
            at a glance.
          </h2>
          {selected ? (
            <>
              <h3>
                {selected.brand} {selected.model}
              </h3>
              <p>
                {rentalDays(pickup, returned)} rental days ×{" "}
                {money(selected.dailyRate)}
              </p>
              <div className="summary-total">
                <span>Estimated total</span>
                <strong>
                  {money(rentalDays(pickup, returned) * selected.dailyRate)}
                </strong>
              </div>
              <p className="muted small-text">
                An estimate based on the current daily rate. The service
                confirms and saves your final amount when you reserve.
              </p>
            </>
          ) : (
            <p>Select a vehicle to preview your rental.</p>
          )}
          <div className="notice">
            Payment is a separate step after your booking is confirmed.
          </div>
        </aside>
      </div>
    </>
  );
}
