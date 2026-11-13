import { Link, useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { Empty, Heading, QueryState } from "../../components/ui";
import { money } from "../../utils/domain";

type Settlement = {
  paymentId: string;
  bookingId: string;
  previousStatus: string;
  outcome: string;
  amount: number;
  simulatedRefund: number;
  reason: string;
};
export type DeletionReceipt = {
  operationId: string;
  kind: string;
  targetId: string;
  requestedAt: string;
  settlements: Settlement[];
  notificationCount: number;
  status: string;
  actorId?: string;
  reason?: string;
  affectedRecords?: {
    bookings: number | null;
    payments: number | null;
    maintenance: number | null;
    reviews: number | null;
    favourites: number | null;
    images: number | null;
    notificationsRemoved: number | null;
    historicalBookings: number | null;
  };
  simulatedRefundTotal?: number;
  pendingPaymentVoids?: number;
};

function auditCount(value: number | null | undefined) {
  return value == null ? "Not recorded" : String(value);
}

export function MySettlements() {
  const receipts = useApi<DeletionReceipt[]>("/deletions/settlements/mine", true);
  return (
    <>
      <Heading title="My settlements">Durable records of simulated refunds and voids. No actual money is transferred.</Heading>
      <QueryState query={receipts} empty={receipts.isSuccess && receipts.data.length === 0}>
        <div className="stack">
          {receipts.data?.map((receipt) => (
            <article className="panel" key={receipt.operationId}>
              <div className="row"><strong>{receipt.kind.replaceAll("_", " ")}</strong><span>{receipt.status}</span></div>
              <small>{new Date(receipt.requestedAt).toLocaleString()}</small>
              {receipt.settlements.map((settlement) => (
                <p key={settlement.paymentId}>
                  {settlement.outcome.replaceAll("_", " ")} · {money(settlement.simulatedRefund)}
                </p>
              ))}
              <Link className="text-link" to={`/account/settlements/${receipt.operationId}`}>View receipt →</Link>
            </article>
          ))}
        </div>
      </QueryState>
    </>
  );
}

export function DeletionReceiptView({ admin = false }: { admin?: boolean }) {
  const { operationId } = useParams();
  const receipt = useApi<DeletionReceipt>(`/deletions/${operationId}/receipt`, true, !!operationId);
  const back = admin ? "/admin/deletions" : "/account/settlements";
  return (
    <>
      <Heading title="Deletion receipt">Settlement facts are retained even if the original record is gone.</Heading>
      <QueryState query={receipt}>
        {receipt.data && <article className="panel">
          <p><strong>Operation:</strong> {receipt.data.operationId}</p>
          <p><strong>Status:</strong> {receipt.data.status}</p>
          <p><strong>Recorded:</strong> {new Date(receipt.data.requestedAt).toLocaleString()}</p>
          {admin && <>
            <p><strong>Actor:</strong> {receipt.data.actorId || "Not recorded"}</p>
            <p><strong>Reason:</strong> {receipt.data.reason || "Not recorded"}</p>
            <p><strong>Persisted customer-notification snapshots:</strong> {receipt.data.notificationCount}</p>
            {receipt.data.affectedRecords && <p><strong>Affected records:</strong> {auditCount(receipt.data.affectedRecords.bookings)} bookings, {auditCount(receipt.data.affectedRecords.payments)} payments, {auditCount(receipt.data.affectedRecords.maintenance)} maintenance, {auditCount(receipt.data.affectedRecords.reviews)} reviews.</p>}
            <p><strong>Pending payment voids:</strong> {receipt.data.pendingPaymentVoids ?? "Not recorded"}</p>
          </>}
          {receipt.data.settlements.length ? <div className="stack">
            {receipt.data.settlements.map((settlement) => <div key={settlement.paymentId} className="notice">
              <strong>{settlement.outcome.replaceAll("_", " ")}</strong><br />
              {settlement.outcome === "VOIDED" ? "Pending payment voided. No money was collected."
                : settlement.outcome === "COMPLETED_NO_AUTO_REFUND" ? "Completed rental — no automatic refund."
                : settlement.outcome === "SIMULATED_FULL_REFUND" ? `Simulated refund recorded: ${money(settlement.simulatedRefund)}. No actual money was transferred.`
                : `No refund required. Simulated amount: ${money(settlement.simulatedRefund)}.`}
            </div>)}
          </div> : <Empty title="No financial settlement was required." />}
          <Link className="button secondary" to={back}>Back</Link>
        </article>}
      </QueryState>
    </>
  );
}

export function DeletionHistory() {
  const history = useApi<DeletionReceipt[]>("/deletions/history", true);
  return (
    <>
      <Heading title="Deletion history">Administrative audit records for completed and recovering operations.</Heading>
      <QueryState query={history} empty={history.isSuccess && history.data.length === 0}>
        <div className="stack">
          {history.data?.map((receipt) => <article className="panel" key={receipt.operationId}>
            <div className="row"><strong>{receipt.kind}</strong><span>{receipt.status}</span></div>
            <small>{receipt.operationId} · {new Date(receipt.requestedAt).toLocaleString()}</small>
            <p><strong>Actor:</strong> {receipt.actorId || "Not recorded"} · <strong>Reason:</strong> {receipt.reason || "Not recorded"}</p>
            <p>{receipt.affectedRecords ? `${auditCount(receipt.affectedRecords.bookings)} bookings, ${auditCount(receipt.affectedRecords.payments)} payments, ${auditCount(receipt.affectedRecords.reviews)} reviews affected.` : "Affected record counts not recorded."}</p>
            <p>{receipt.settlements.length} settlement record(s); {receipt.notificationCount} persisted notification snapshot(s). {receipt.simulatedRefundTotal != null && `Simulated refunds: ${money(receipt.simulatedRefundTotal)}.`}</p>
            <Link className="text-link" to={`/admin/deletions/${receipt.operationId}`}>View receipt →</Link>
          </article>)}
        </div>
      </QueryState>
    </>
  );
}
