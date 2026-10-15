import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import {
  EmptyState,
  Field,
  PageHeader,
  ResourceView,
  Select,
} from "../../components/common/UI";
import { VehicleCard } from "../../components/vehicles/VehicleCard";
import { today } from "../../utils/format";
export default function Catalogue({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams(),
    { user } = useAuth();
  const key = params.toString(),
    resource = useResource(
      () => vehiclesApi.list(Object.fromEntries(new URLSearchParams(key))),
      key,
    );
  return (
    <div className={admin ? "" : "wrap public-page"}>
      <PageHeader
        eyebrow={admin ? "Fleet management" : "The collection"}
        title={admin ? "Vehicle management" : "Browse vehicles"}
        description={
          admin
            ? "Manage your vehicles, daily rates and availability."
            : "A considered selection. A journey that is entirely yours."
        }
        action={
          user?.role === "ADMIN" && (
            <Link className="btn" to="/admin/vehicles/new">
              <Plus size={16} /> Add vehicle
            </Link>
          )
        }
      />
      <form
        key={key}
        className="filter-panel"
        onInput={(e) =>
          (
            e.currentTarget.elements.namedItem("returnDate") as HTMLInputElement
          ).setCustomValidity("")
        }
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            next = new URLSearchParams();
          f.forEach((v, k) => {
            if (String(v)) next.set(k, String(v));
          });
          const from = next.get("pickupDate"),
            to = next.get("returnDate");
          const input = e.currentTarget.elements.namedItem(
            "returnDate",
          ) as HTMLInputElement;
          if (!!from !== !!to || (from && to && from >= to)) {
            input.setCustomValidity(
              "Choose both dates, with return after pickup.",
            );
            input.reportValidity();
            return;
          }
          setParams(next);
        }}
      >
        <Field
          label="Search the collection"
          name="q"
          placeholder="Brand, model or registration"
          defaultValue={params.get("q") || ""}
        />
        <Select
          label="Vehicle type"
          name="type"
          defaultValue={params.get("type") || ""}
        >
          <option value="">All vehicles</option>
          <option value="CAR">Cars</option>
          <option value="MOTORCYCLE">Motorcycles</option>
        </Select>
        <Field
          label="Minimum passengers"
          name="minimumPassengers"
          type="number"
          min={0}
          max={9}
          defaultValue={params.get("minimumPassengers") || ""}
        />
        <Field
          label="Pick-up date"
          name="pickupDate"
          type="date"
          min={today()}
          defaultValue={params.get("pickupDate") || ""}
        />
        <Field
          label="Return date"
          name="returnDate"
          type="date"
          min={today()}
          defaultValue={params.get("returnDate") || ""}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
        />
        <div className="actions">
          <button className="btn" type="submit">
            <Search size={17} /> Search
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setParams({})}
          >
            Reset
          </button>
        </div>
      </form>
      <p className="muted small-text">
        {params.get("pickupDate")
          ? "Results are checked against bookings and maintenance for your dates."
          : "Vehicle status is shown below. Select dates to check rental availability."}
      </p>
      <ResourceView resource={resource}>
        {(data) => (
          <>
            <div className="results-count">
              {data.length} {data.length === 1 ? "vehicle" : "vehicles"} in this
              selection
            </div>
            {data.length ? (
              <div className="vehicle-grid">
                {data.map((v) => (
                  <div key={v.id}>
                    <VehicleCard vehicle={v} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="A different journey awaits."
                description="No vehicles match these filters, or the fleet has not been added yet. Try other dates or clear the filters."
              />
            )}
          </>
        )}
      </ResourceView>
    </div>
  );
}
