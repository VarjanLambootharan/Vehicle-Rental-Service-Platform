import { Link, useNavigate, useParams } from "react-router-dom";
import { maintenanceApi, vehiclesApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  Badge,
  Details,
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
import { canStartMaintenance } from "../../utils/rules";
import { date, money, today, vehicleName } from "../../utils/format";
export default function MaintenanceForm() {
  const { id } = useParams(),
    navigate = useNavigate(),
    feedback = useFeedback();
  const resource = useResource(async () => {
    const [record, vehicles] = await Promise.all([
      id ? maintenanceApi.get(id) : Promise.resolve(null),
      vehiclesApi.list(),
    ]);
    return { record, vehicles };
  }, id || "new");
  return (
    <>
      <PageHeader
        eyebrow="Vehicle maintenance"
        title={id ? "Manage maintenance" : "Schedule maintenance"}
        description="Maintenance intervals exclude the end date. Conflicts are checked by the service."
        action={
          <Link className="btn secondary" to="/admin/maintenance">
            All maintenance
          </Link>
        }
      />
      <ResourceView resource={resource}>
        {({ record: m, vehicles }) => (
          <>
            {m && (
              <section className="panel section-gap">
                <div className="row-between">
                  <h2>{vehicleName(m.vehicleId, vehicles)}</h2>
                  <Badge value={m.status} />
                </div>
                <Details
                  items={[
                    ["Record reference", m.id],
                    ["Description", m.description],
                    ["Start", date(m.startDate)],
                    ["End", date(m.endDate)],
                    ["Cost", money(m.cost)],
                  ]}
                />
                <div className="actions">
                  {(canStartMaintenance(m) || m.status === "IN_PROGRESS") && (
                    <button
                      className="btn"
                      onClick={() =>
                        feedback.confirm({
                          title:
                            m.status === "IN_PROGRESS"
                              ? "Complete this maintenance?"
                              : "Start this maintenance?",
                          message:
                            "The service checks the interval and outstanding rental commitments. Vehicle administrative status is managed separately.",
                          action:
                            m.status === "IN_PROGRESS"
                              ? "Complete maintenance"
                              : "Start maintenance",
                          run: async () => {
                            const current = await maintenanceApi.get(m.id);
                            await maintenanceApi.update(m.id, {
                              description: current.description,
                              startDate: current.startDate,
                              endDate: current.endDate,
                              cost: current.cost,
                              status:
                                m.status === "IN_PROGRESS"
                                  ? "COMPLETED"
                                  : "IN_PROGRESS",
                            });
                            feedback.toast("Maintenance status updated.");
                            resource.reload();
                          },
                        })
                      }
                    >
                      {m.status === "IN_PROGRESS"
                        ? "Complete maintenance"
                        : "Start maintenance"}
                    </button>
                  )}
                  {m.status === "SCHEDULED" && (
                    <button
                      className="btn secondary danger"
                      onClick={() =>
                        feedback.confirm({
                          title: "Cancel scheduled maintenance?",
                          message:
                            "The record is retained as cancelled and stops blocking its scheduled dates.",
                          action: "Cancel maintenance",
                          run: async () => {
                            await maintenanceApi.cancel(m.id);
                            feedback.toast("Maintenance cancelled.");
                            resource.reload();
                          },
                        })
                      }
                    >
                      Cancel maintenance
                    </button>
                  )}
                </div>
                {m.status === "SCHEDULED" && !canStartMaintenance(m) && (
                  <p className="notice">
                    Maintenance can start only during its scheduled interval.
                  </p>
                )}
              </section>
            )}
            {(!m || m.status === "SCHEDULED") && (
              <Form
                key={m?.updatedAt || "new"}
                onSave={async (f) => {
                  const body = {
                    description: value(f, "description"),
                    startDate: value(f, "startDate"),
                    endDate: value(f, "endDate"),
                    cost: Number(value(f, "cost")),
                  };
                  if (body.endDate <= body.startDate)
                    throw new Error("End date must be after start date.");
                  const result = m
                    ? await maintenanceApi.update(m.id, {
                        ...body,
                        status: "SCHEDULED",
                      })
                    : await maintenanceApi.create({
                        ...body,
                        vehicleId: value(f, "vehicleId"),
                      });
                  feedback.toast(
                    m ? "Maintenance details saved." : "Maintenance scheduled.",
                  );
                  navigate(`/admin/maintenance/${result.id}/edit`);
                  resource.reload();
                }}
              >
                {(busy) => (
                  <>
                    {!m && (
                      <div className="full">
                        <Select
                          label="Vehicle"
                          name="vehicleId"
                          required
                          defaultValue=""
                        >
                          <option value="">Choose a vehicle</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.brand} {v.model} · {v.registrationNumber}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <Field
                      label="Start date"
                      name="startDate"
                      type="date"
                      required
                      min={m ? undefined : today()}
                      defaultValue={m?.startDate}
                    />
                    <Field
                      label="End date (exclusive)"
                      name="endDate"
                      type="date"
                      required
                      min={m ? undefined : today()}
                      defaultValue={m?.endDate}
                    />
                    <Field
                      label="Cost (LKR)"
                      name="cost"
                      type="number"
                      required
                      min={0}
                      max="999999999.99"
                      step="0.01"
                      defaultValue={m?.cost ?? 0}
                    />
                    <Field label="Status" value="SCHEDULED" readOnly />
                    <Textarea
                      label="Maintenance description"
                      name="description"
                      required
                      maxLength={2000}
                      rows={4}
                      defaultValue={m?.description}
                    />
                    <div className="full">
                      <Submit busy={busy}>
                        {m ? "Save maintenance" : "Schedule maintenance"}
                      </Submit>
                    </div>
                  </>
                )}
              </Form>
            )}
            <p className="notice section-gap">
              Starting or completing maintenance does not automatically change
              the vehicle’s administrative status. Manage that restriction from
              the vehicle page.
            </p>
          </>
        )}
      </ResourceView>
    </>
  );
}
