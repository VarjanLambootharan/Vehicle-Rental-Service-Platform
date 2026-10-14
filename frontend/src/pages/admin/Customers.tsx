import { useState } from "react";
import { customersApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Badge,
  DataTable,
  Details,
  Field,
  PageHeader,
  ResourceView,
  Select,
  useFeedback,
} from "../../components/common/UI";
import { date } from "../../utils/format";
export default function Customers() {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState("");
  const resource = useResource(() => customersApi.list(q), q),
    detail = useResource(
      () => (selected ? customersApi.get(selected) : Promise.resolve(null)),
      selected,
    ),
    feedback = useFeedback();
  return (
    <>
      <PageHeader
        eyebrow="Customer management"
        title="Customers"
        description="Find customers and manage account access."
      />
      <form
        className="filter-panel compact"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(String(new FormData(e.currentTarget).get("q") || ""));
        }}
      >
        <Field
          label="Find a customer"
          name="q"
          placeholder="Search name or email"
        />
        <Select
          label="Account status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All customers</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <button className="btn">Search</button>
      </form>
      <ResourceView resource={resource}>
        {(rows) => (
          <DataTable
            data={rows.filter(
              (c) => !status || c.active === (status === "active"),
            )}
            columns={[
              {
                title: "Customer",
                render: (c) => (
                  <>
                    <strong>{c.fullName}</strong>
                    <small className="block muted">{c.email}</small>
                  </>
                ),
              },
              { title: "Phone", render: (c) => c.phone },
              {
                title: "Status",
                render: (c) => (
                  <Badge value={c.active ? "ACTIVE" : "INACTIVE"} />
                ),
              },
              {
                title: "Actions",
                render: (c) => (
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => setSelected(c.id)}
                    >
                      View details
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        feedback.confirm({
                          title: `${c.active ? "Deactivate" : "Activate"} ${c.fullName}?`,
                          message: c.active
                            ? "This prevents sign-in. Protected bookings must be resolved first. Customer history is preserved."
                            : "This restores sign-in access for this customer.",
                          action: c.active ? "Deactivate" : "Activate",
                          run: async () => {
                            await customersApi.active(c.id, !c.active);
                            feedback.toast("Customer account updated.");
                            resource.reload();
                            detail.reload();
                          },
                        })
                      }
                    >
                      {c.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </ResourceView>
      {selected && (
        <section className="panel section-gap">
          <div className="row-between">
            <h2>Customer details</h2>
            <button className="text-button" onClick={() => setSelected("")}>
              Close
            </button>
          </div>
          <ResourceView resource={detail}>
            {(c) =>
              c && (
                <Details
                  items={[
                    ["Name", c.fullName],
                    ["Email", c.email],
                    ["Phone", c.phone],
                    ["Account reference", c.id],
                    ["Joined", date(c.createdAt)],
                    ["Updated", date(c.updatedAt)],
                  ]}
                />
              )
            }
          </ResourceView>
        </section>
      )}
    </>
  );
}
