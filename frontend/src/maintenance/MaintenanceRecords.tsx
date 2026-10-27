import { query } from "../../api/client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { maintenanceApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Badge,
  DataTable,
  Field,
  PageHeader,
  ResourceView,
  Select,
} from "../../components/common/UI";
import { date, money, vehicleName } from "../../utils/format";
export default function MaintenanceRecords() {
  const [filters, setFilters] = useState({ q: "", vehicleId: "" }),
    [status, setStatus] = useState("");
  const resource = useResource(async () => {
    const [records, vehicles] = await Promise.all([
      maintenanceApi.list(filters.q, filters.vehicleId),
      vehiclesApi.list(),
    ]);
    return { records, vehicles };
  }, query(filters));
  return (
    <>
      <PageHeader
        eyebrow="Vehicle maintenance"
        title="Maintenance records"
        description="Plan service intervals and keep the fleet ready for the road."
        action={
          <Link className="btn" to="/admin/maintenance/new">
            Add maintenance →
          </Link>
        }
      />
      <form
        className="filter-panel compact"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setFilters({
            q: String(f.get("q") || ""),
            vehicleId: String(f.get("vehicleId") || ""),
          });
        }}
      >
        <Field label="Search maintenance" name="q" placeholder="Description" />
        <Select label="Vehicle" name="vehicleId">
          <option value="">All vehicles</option>
          {resource.data?.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model} · {v.registrationNumber}
            </option>
          ))}
        </Select>
        <Select
          label="Maintenance status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <button className="btn">Search</button>
      </form>
      <ResourceView resource={resource}>
        {({ records, vehicles }) => (
          <DataTable
            data={records.filter((r) => !status || r.status === status)}
            columns={[
              {
                title: "Vehicle",
                render: (m) => (
                  <Link
                    className="table-link"
                    to={`/admin/maintenance/${m.id}/edit`}
                  >
                    {vehicleName(m.vehicleId, vehicles)}
                  </Link>
                ),
              },
              {
                title: "Service details",
                render: (m) => (
                  <span className="clamp-text">{m.description}</span>
                ),
              },
              {
                title: "Scheduled dates",
                render: (m) => (
                  <>
                    {date(m.startDate)}
                    <small className="block muted">to {date(m.endDate)}</small>
                  </>
                ),
              },
              { title: "Cost", render: (m) => money(m.cost) },
              { title: "Status", render: (m) => <Badge value={m.status} /> },
              {
                title: "Actions",
                render: (m) => (
                  <Link
                    className="text-link"
                    to={`/admin/maintenance/${m.id}/edit`}
                  >
                    {["SCHEDULED", "IN_PROGRESS"].includes(m.status)
                      ? "Manage record"
                      : "View record"}
                  </Link>
                ),
              },
            ]}
          />
        )}
      </ResourceView>
    </>
  );
}
