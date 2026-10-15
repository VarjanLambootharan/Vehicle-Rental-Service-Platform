import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Badge,
  Field,
  Form,
  PageHeader,
  ResourceView,
  Select,
  Submit,
  Textarea,
  useFeedback,
  value,
} from "../../components/common/UI";
import type { Vehicle, VehicleRequest, VehicleStatus } from "../../types/api";
export default function VehicleForm() {
  const { id } = useParams(),
    navigate = useNavigate(),
    feedback = useFeedback(),
    [creationVersion, setCreationVersion] = useState(0);
  const resource = useResource(
    () => (id ? vehiclesApi.get(id) : Promise.resolve(null)),
    id || "new",
  );
  return (
    <>
      <PageHeader
        eyebrow="Fleet management"
        title={id ? "Edit vehicle" : "Add vehicle"}
        description={
          id
            ? "Update the vehicle, its daily rate and administrative status."
            : "Introduce a vehicle to the collection."
        }
        action={
          <Link className="btn secondary" to="/admin/vehicles">
            Back to fleet
          </Link>
        }
      />
      <ResourceView resource={resource}>
        {(vehicle) => (
          <Editor
            key={vehicle?.updatedAt || `new-${creationVersion}`}
            vehicle={vehicle}
            onSave={async (body) => {
              const saved = id
                ? await vehiclesApi.update(id, body)
                : await vehiclesApi.create(body);
              feedback.toast(
                id
                  ? "Vehicle details saved."
                  : "Vehicle added to the collection.",
              );
              if (id) {
                navigate(`/admin/vehicles/${saved.id}/edit`);
                resource.reload();
              } else {
                // Re-mount only after the API confirms creation. Failed saves retain input.
                setCreationVersion((version) => version + 1);
              }
            }}
          />
        )}
      </ResourceView>
      {id && resource.data && (
        <section className="panel section-gap">
          <h2>Availability & status</h2>
          <Badge value={resource.data.status} />
          <Form
            onSave={async (f) => {
              const status = value(f, "status") as VehicleStatus;
              const update = async () => {
                await vehiclesApi.status(id, status);
                feedback.toast("Vehicle status updated.");
                resource.reload();
              };
              if (status === "INACTIVE")
                feedback.confirm({
                  title: "Deactivate this vehicle?",
                  message:
                    "This hides the vehicle from the public catalogue. Historical records are retained and protected bookings may prevent deactivation.",
                  action: "Deactivate vehicle",
                  run: update,
                });
              else await update();
            }}
            className="inline-form"
          >
            {(busy) => (
              <>
                <Select
                  label="Administrative status"
                  name="status"
                  defaultValue={resource.data?.status}
                >
                  {["AVAILABLE", "IN_MAINTENANCE", "INACTIVE"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <Submit busy={busy}>Update status</Submit>
              </>
            )}
          </Form>
          <p className="muted">
            Bookings and maintenance also determine date availability. Protected
            bookings may prevent status changes.
          </p>
          {resource.data.status !== "INACTIVE" && (
            <button
              className="btn danger secondary"
              onClick={() =>
                feedback.confirm({
                  title: "Deactivate this vehicle?",
                  message:
                    "The vehicle will become inactive and disappear from the public collection. Historical records are retained. An administrator can reactivate it.",
                  action: "Deactivate vehicle",
                  run: async () => {
                    await vehiclesApi.deactivate(id);
                    feedback.toast("Vehicle deactivated.");
                    resource.reload();
                  },
                })
              }
            >
              Deactivate vehicle
            </button>
          )}
        </section>
      )}
    </>
  );
}
function Editor({
  vehicle,
  onSave,
}: {
  vehicle: Vehicle | null;
  onSave: (body: VehicleRequest) => Promise<void>;
}) {
  const [type, setType] = useState<"CAR" | "MOTORCYCLE">(
    vehicle?.type || "CAR",
  );
  return (
    <Form
      onSave={async (f) =>
        onSave({
          type,
          registrationNumber: value(f, "registrationNumber"),
          brand: value(f, "brand"),
          model: value(f, "model"),
          dailyRate: Number(value(f, "dailyRate")),
          description: value(f, "description"),
          ...(type === "CAR"
            ? {
                seats: Number(value(f, "seats")),
                transmission: value(f, "transmission"),
              }
            : { engineCapacityCc: Number(value(f, "engineCapacityCc")) }),
        })
      }
    >
      {(busy) => (
        <>
          <Select
            label="Vehicle type"
            value={type}
            disabled={!!vehicle}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="CAR">Car</option>
            <option value="MOTORCYCLE">Motorcycle</option>
          </Select>
          <Field
            label="Registration number"
            name="registrationNumber"
            required
            maxLength={30}
            defaultValue={vehicle?.registrationNumber}
          />
          <Field
            label="Brand"
            name="brand"
            required
            maxLength={80}
            defaultValue={vehicle?.brand}
          />
          <Field
            label="Model"
            name="model"
            required
            maxLength={80}
            defaultValue={vehicle?.model}
          />
          <Field
            label="Daily rate (LKR)"
            name="dailyRate"
            required
            type="number"
            min="0.01"
            max="999999999.99"
            step="0.01"
            defaultValue={vehicle?.dailyRate}
          />
          {type === "CAR" ? (
            <>
              <Field
                label="Seats"
                name="seats"
                required
                type="number"
                min={2}
                max={9}
                defaultValue={vehicle?.seats || 5}
              />
              <Field
                label="Transmission"
                name="transmission"
                required
                maxLength={40}
                placeholder="e.g. AUTOMATIC"
                defaultValue={vehicle?.transmission || ""}
              />
            </>
          ) : (
            <Field
              label="Engine capacity (cc)"
              name="engineCapacityCc"
              required
              type="number"
              min={50}
              max={2500}
              defaultValue={vehicle?.engineCapacityCc || 150}
            />
          )}
          <Textarea
            label="Description"
            name="description"
            maxLength={2000}
            rows={4}
            defaultValue={vehicle?.description}
          />
          <p className="full muted small-text">
            Vehicle type cannot change after creation. Existing bookings keep
            their saved rental rates.
          </p>
          <div className="full">
            <Submit busy={busy}>
              {vehicle ? "Save vehicle" : "Add to collection"}
            </Submit>
          </div>
        </>
      )}
    </Form>
  );
}
