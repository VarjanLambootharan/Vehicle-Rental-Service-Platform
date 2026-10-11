import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Compass,
  LoaderCircle,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { label } from "../../utils/format";
export function PageHeader({
  eyebrow = "Traveler",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      <span />
      {label(value)}
    </span>
  );
}
export function Field({
  label: text,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{text}</label>
      <input
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Select({
  label: text,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{text}</label>
      <select {...props} id={id}>
        {children}
      </select>
    </div>
  );
}
export function Textarea({
  label: text,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId();
  return (
    <div className="form-field full">
      <label htmlFor={id}>{text}</label>
      <textarea {...props} id={id} />
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading records">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
      <span>Preparing the details…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error | string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <CircleAlert size={22} />
      <div>
        <strong>Something needs your attention</strong>
        <p>{typeof error === "string" ? error : error.message}</p>
        {retry && (
          <button type="button" className="btn secondary small" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function EmptyState({
  title = "No records yet",
  description = "There are no records to show yet.",
  to,
  action,
}: {
  title?: string;
  description?: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">
        <Compass size={34} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {to && (
        <Link className="text-link" to={to}>
          {action || "View details"} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function ResourceView<T>({
  resource,
  children,
}: {
  resource: { loading: boolean; error?: Error; data?: T; reload: () => void };
  children: (data: T) => ReactNode;
}) {
  if (resource.loading) return <Loading />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  if (resource.data === undefined) return null;
  return <>{children(resource.data)}</>;
}
export function Submit({
  busy,
  children = "Save changes",
}: {
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <button className="btn" type="submit" disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle size={17} className="spin" /> Saving…
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={17} />
        </>
      )}
    </button>
  );
}
export function Form({
  onSave,
  children,
  className = "panel form-grid",
  onSuccess,
}: {
  onSave: (data: FormData) => Promise<unknown>;
  children: (busy: boolean) => ReactNode;
  className?: string;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await onSave(data);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save changes.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <form className={className} onSubmit={submit} aria-busy={busy}>
      {error && (
        <div className="full">
          <ErrorState error={error} />
        </div>
      )}
      <fieldset disabled={busy} className="form-contents">
        {children(busy)}
      </fieldset>
    </form>
  );
}
export const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
export function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="details">
      {items.map(([key, val]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{val ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export function DataTable<T extends { id: string }>({
  data,
  columns,
  empty,
}: {
  data: T[];
  columns: { title: string; render: (row: T) => ReactNode }[];
  empty?: string;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(data.length / 8)),
    current = Math.min(page, pages);
  if (!data.length)
    return (
      <EmptyState description={empty || "No records match your selection."} />
    );
  return (
    <div className="table-panel">
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Records table, scroll horizontally for more columns"
      >
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.title}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice((current - 1) * 8, current * 8).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.title}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          {data.length} records · Page {current} of {pages}
        </span>
        <div>
          <button
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
interface ConfirmOptions {
  title: string;
  message: string;
  action?: string;
  run: () => Promise<unknown>;
}
interface Feedback {
  toast: (message: string) => void;
  confirm: (options: ConfirmOptions) => void;
}
const FeedbackContext = createContext<Feedback | null>(null);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toastText, setToast] = useState(""),
    [confirm, setConfirm] = useState<ConfirmOptions | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    locked = useRef(false);
  useEffect(() => {
    if (!toastText) return;
    const timeout = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timeout);
  }, [toastText]);
  useEffect(() => {
    if (confirm) {
      setError("");
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [confirm]);
  async function proceed() {
    if (!confirm || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await confirm.run();
      setConfirm(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete the action.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <FeedbackContext.Provider value={{ toast: setToast, confirm: setConfirm }}>
      {children}
      {toastText && (
        <div className="toast" role="status">
          <Check size={18} />
          {toastText}
          <button onClick={() => setToast("")} aria-label="Dismiss message">
            <X size={18} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setConfirm(null);
        }}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <span className="eyebrow">Please confirm</span>
        <h2 id="confirm-title">{confirm?.title}</h2>
        <p id="confirm-description">{confirm?.message}</p>
        {error && <ErrorState error={error} />}
        <div className="actions">
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => setConfirm(null)}
            autoFocus
          >
            Go back
          </button>
          <button className="btn danger" disabled={busy} onClick={proceed}>
            {busy ? "Working…" : confirm?.action || "Confirm"}
          </button>
        </div>
      </dialog>
    </FeedbackContext.Provider>
  );
}
export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("FeedbackProvider missing");
  return ctx;
}
