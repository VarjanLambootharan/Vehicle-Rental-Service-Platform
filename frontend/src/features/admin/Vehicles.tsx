import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
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
  Icon,
  Success,
} from "../../components/ui";
import {
  categories,
  categoryFor,
  money,
  vehicleSchema,
  specifications,
} from "../../utils/domain";
import type { Vehicle, VehicleType, VehicleImage } from "../../types";
type VehicleValues = {
  type: VehicleType;
  registrationNumber: string;
  brand: string;
  model: string;
  dailyRate: number;
  description: string;
  seats?: number;
  transmission?: string;
  engineCapacityCc?: number;
};
export function VehicleForm({
  vehicle,
  onSaved,
}: {
  vehicle?: Vehicle;
  onSaved: (created: boolean) => void;
}) {
  const action = useAction();
  const [success, setSuccess] = useState("");
  const {
    register,
    watch,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<VehicleValues>({
    defaultValues: vehicle
      ? {
          type: vehicle.type,
          registrationNumber: vehicle.registrationNumber,
          brand: vehicle.brand,
          model: vehicle.model,
          dailyRate: vehicle.dailyRate,
          description: vehicle.description,
          ...(vehicle.type === "CAR" || vehicle.type === "VAN"
            ? { seats: vehicle.seats, transmission: vehicle.transmission }
            : { engineCapacityCc: vehicle.engineCapacityCc ?? undefined }),
        }
      : { type: "CAR", description: "" },
    shouldUnregister: true,
  });
  const type = watch("type") || "CAR",
    passenger = type === "CAR" || type === "VAN";
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const body = { ...values, type: vehicle?.type || values.type };
        const result = vehicleSchema.safeParse(body);
        if (!result.success) {
          result.error.issues.forEach((i) =>
            setError(i.path[0] as keyof VehicleValues, { message: i.message }),
          );
          return;
        }
        try {
          await action.mutateAsync({
            path: "/vehicles" + (vehicle ? "/" + vehicle.id : ""),
            method: vehicle ? "PUT" : "POST",
            body: result.data,
          });
          if (vehicle) {
            onSaved(false);
          } else {
            reset({
              type: "CAR",
              registrationNumber: "",
              brand: "",
              model: "",
              dailyRate: undefined,
              description: "",
              seats: undefined,
              transmission: "",
              engineCapacityCc: undefined,
            });
            action.reset();
            setSuccess("Vehicle created. You can add another vehicle now.");
            onSaved(true);
          }
        } catch {
          /* retain submitted inputs */
        }
      })}
    >
      <label>
        Vehicle category
        <select {...register("type")} disabled={!!vehicle}>
          {Object.entries(categories).map(([k, v]) => (
            <option key={k} value={k}>
              {v.singular}
            </option>
          ))}
        </select>
      </label>
      <div className="grid two">
        {(["registrationNumber", "brand", "model", "dailyRate"] as const).map(
          (k) => (
            <label key={k}>
              {
                {
                  registrationNumber: "Registration number",
                  brand: "Brand",
                  model: "Model",
                  dailyRate: "Daily rate (LKR)",
                }[k]
              }
              <input
                {...register(
                  k,
                  k === "dailyRate" ? { valueAsNumber: true } : {},
                )}
                type={k === "dailyRate" ? "number" : "text"}
                step={k === "dailyRate" ? ".01" : undefined}
                required
              />
              {errors[k] && (
                <span className="field-error">{errors[k].message}</span>
              )}
            </label>
          ),
        )}
      </div>
      {passenger ? (
        <div className="grid two">
          <label>
            Passenger seats
            <input
              type="number"
              {...register("seats", { valueAsNumber: true })}
              min={categories[type].minSeats}
              max={categories[type].maxSeats}
              required
            />
            {errors.seats && (
              <span className="field-error">{errors.seats.message}</span>
            )}
          </label>
          <label>
            Transmission
            <input {...register("transmission")} maxLength={40} required />
            {errors.transmission && (
              <span className="field-error">{errors.transmission.message}</span>
            )}
          </label>
        </div>
      ) : (
        <label>
          Engine capacity (cc)
          <input
            type="number"
            {...register("engineCapacityCc", { valueAsNumber: true })}
            min={50}
            max={2500}
            required
          />
          {errors.engineCapacityCc && (
            <span className="field-error">
              {errors.engineCapacityCc.message}
            </span>
          )}
          <small>
            Passenger capacity is fixed at {categories[type].minSeats}.
          </small>
        </label>
      )}
      <label>
        Description
        <textarea {...register("description")} maxLength={2000} />
      </label>
      {vehicle && (
        <p>
          Vehicle type is fixed. With protected bookings, only the rate and
          description may change.
        </p>
      )}
      <ErrorBox error={action.error} />
      {success && <p className="notice success">{success}</p>}
      <button className="button" disabled={action.isPending}>
        {action.isPending
          ? "Saving…"
          : vehicle
            ? "Save vehicle"
            : "Create vehicle"}
      </button>
    </form>
  );
}
function ImagePreview({ image }: { image: VehicleImage }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image.url]);
  return failed ? (
    <div className="admin-image-placeholder" aria-label="Image unavailable">
      Image unavailable
    </div>
  ) : (
    <img
      className="admin-image-preview"
      src={image.url}
      alt={image.altText}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
export function Images({ vehicle }: { vehicle: Vehicle }) {
  const q = useApi<VehicleImage[]>("/vehicles/" + vehicle.id + "/images", true),
    action = useAction();
  const [editing, setEditing] = useState<VehicleImage | null>(null),
    [remove, setRemove] = useState<VehicleImage | null>(null),
    [success, setSuccess] = useState("");
  return (
    <>
      <p>
        Add actual photos using a hosted image URL. Up to eight images per
        vehicle.
      </p>
      <QueryState query={q}>
        <div className="stack">
          {q.data?.map((i) => (
            <div className="row panel vehicle-image-row" key={i.id}>
              <ImagePreview image={i} />
              <span>
                {i.altText} · Order {i.displayOrder}
              </span>
              <div className="actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setSuccess("");
                    setEditing(i);
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-button danger"
                  onClick={() => {
                    setSuccess("");
                    setRemove(i);
                  }}
                >
                  Permanently delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </QueryState>
      {success && <Success>{success}</Success>}
      <form
        key={editing?.id || "new"}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = new FormData(form);
          const wasEditing = !!editing;
          setSuccess("");
          try {
            await action.mutateAsync({
              path: `/vehicles/${vehicle.id}/images${editing ? "/" + editing.id : ""}`,
              method: editing ? "PUT" : "POST",
              body: {
                url: String(f.get("url")),
                altText: String(f.get("altText")),
                displayOrder: Number(f.get("displayOrder")),
              },
            });
            setEditing(null);
            form.reset();
            setSuccess(
              wasEditing
                ? "Vehicle image updated and the gallery refreshed."
                : "Vehicle image added and the gallery refreshed.",
            );
          } catch {
            /* displayed */
          }
        }}
      >
        <label>
          Image URL
          <input
            type="url"
            name="url"
            required
            pattern="https?://.+"
            maxLength={2008}
            defaultValue={editing?.url}
          />
        </label>
        <label>
          Alternative text
          <input
            name="altText"
            required
            maxLength={200}
            defaultValue={editing?.altText}
          />
        </label>
        <label>
          Display order
          <input
            type="number"
            name="displayOrder"
            required
            min={0}
            max={1000}
            defaultValue={editing?.displayOrder || 0}
          />
        </label>
        <ErrorBox error={action.error} />
        <button
          className="button"
          disabled={
            action.isPending || (!editing && (q.data?.length || 0) >= 8)
          }
        >
          {editing ? "Update image" : "Add image"}
        </button>
        {editing && (
          <button
            type="button"
            className="text-button"
            onClick={() => setEditing(null)}
          >
            Cancel edit
          </button>
        )}
      </form>
      {remove && (
        <Confirm
          title={`Permanently delete “${remove.altText}”?`}
          pending={action.isPending}
          error={action.error}
          confirmLabel="Permanently delete"
          destructive
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            try {
              await action.mutateAsync({
                path: `/vehicles/${vehicle.id}/images/${remove.id}`,
                method: "DELETE",
              });
              setRemove(null);
              setSuccess("Vehicle image removed and the gallery refreshed.");
            } catch {
              /* displayed */
            }
          }}
        >
          This cannot be undone. The stored image reference will be removed from this vehicle gallery. A hosted image file may remain at its external URL.
        </Confirm>
      )}
    </>
  );
}
export function AdminVehicles() {
  const q = useApi<Vehicle[]>("/vehicles", true),
    action = useAction();
  const [term, setTerm] = useState(""),
    [type, setType] = useState(""),
    [editing, setEditing] = useState<Vehicle | "new" | null>(null),
    [detail, setDetail] = useState<Vehicle | null>(null),
    [images, setImages] = useState<Vehicle | null>(null),
    [remove, setRemove] = useState<Vehicle | null>(null),
    [deletionPending, setDeletionPending] = useState(""),
    [status, setStatus] = useState<{ vehicle: Vehicle; value: string } | null>(
      null,
    );
  const list = q.data?.filter(
    (v) =>
      (!type || v.type === type) &&
      `${v.brand} ${v.model} ${v.registrationNumber}`
        .toLowerCase()
        .includes(term.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Vehicle collection"
        eyebrow="Manage every kind of journey"
        action={
          <button className="button" onClick={() => setEditing("new")}>
            <Plus size={18} /> Add vehicle
          </button>
        }
      />
      <div className="toolbar">
        <input
          aria-label="Search vehicles"
          placeholder="Search brand, model or registration"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <select
          aria-label="Filter category"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All categories</option>
          {Object.entries(categories).map(([k, c]) => (
            <option key={k} value={k}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {deletionPending && <div className="notice">{deletionPending}</div>}
      <QueryState query={q}>
        {list?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Registration</th>
                  <th>Category</th>
                  <th>Daily rate</th>
                  <th>Status</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <button
                        className="text-button strong"
                        onClick={() => setDetail(v)}
                      >
                        {v.brand} {v.model}
                      </button>
                    </td>
                    <td>{v.registrationNumber}</td>
                    <td>{categoryFor(v.type).singular}</td>
                    <td>{money(v.dailyRate)}</td>
                    <td>
                      <select
                        aria-label={"Status for " + v.registrationNumber}
                        value={v.status}
                        onChange={(e) =>
                          setStatus({ vehicle: v, value: e.target.value })
                        }
                      >
                        {["AVAILABLE", "IN_MAINTENANCE", "INACTIVE"].map(
                          (s) => (
                            <option value={s} key={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="text-button"
                          onClick={() => setEditing(v)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setImages(v)}
                        >
                          Images
                        </button>
                        {v.status !== "INACTIVE" && (
                          <button
                            className="text-button danger"
                            onClick={() =>
                              setStatus({ vehicle: v, value: "INACTIVE" })
                            }
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          className="text-button danger"
                          onClick={() => setRemove(v)}
                        >
                          Permanently delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No matching vehicles" />
        )}
      </QueryState>
      {editing && (
        <Modal
          title={editing === "new" ? "Add a vehicle" : "Edit vehicle"}
          onClose={() => setEditing(null)}
        >
          <VehicleForm
            vehicle={editing === "new" ? undefined : editing}
            onSaved={(created) => {
              if (!created) setEditing(null);
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal
          title={detail.brand + " " + detail.model}
          onClose={() => setDetail(null)}
        >
          <Icon type={detail.type} />
          <p>{detail.description}</p>
          <p>{specifications(detail).join(" · ")}</p>
          <p>{detail.rentalGuidance}</p>
          <Badge value={detail.status} />
          <p>{money(detail.dailyRate)} per day</p>
          <small className="break">{detail.id}</small>
        </Modal>
      )}
      {images && (
        <Modal
          title={"Photos · " + images.brand + " " + images.model}
          onClose={() => setImages(null)}
        >
          <Images vehicle={images} />
        </Modal>
      )}
      {status && (
        <Confirm
          title="Change vehicle status?"
          pending={action.isPending}
          error={action.error}
          onClose={() => setStatus(null)}
          onConfirm={async () => {
            try {
              await action.mutateAsync({
                path: "/vehicles/" + status.vehicle.id + "/status",
                method: "PATCH",
                body: { status: status.value },
              });
              setStatus(null);
            } catch {
              /* displayed */
            }
          }}
        >
          Set {status.vehicle.brand} {status.vehicle.model} to{" "}
          {status.value.replace(/_/g, " ").toLowerCase()}. Protected bookings
          may prevent this change.
        </Confirm>
      )}
      {remove && (
        <DeletionModal
          kind="VEHICLE"
          targetId={remove.id}
          title={`Permanently delete ${remove.brand} ${remove.model}?`}
          reasons={["VEHICLE_UNAVAILABLE", "SAFETY_CONCERN", "CATALOGUE_CLEANUP", "OTHER"]}
          onClose={() => setRemove(null)}
          onCompleted={(result) => setDeletionPending(pendingDeletionMessage(result) || "Deletion completed. See deletion history for its receipt.")}
        />
      )}
    </>
  );
}
