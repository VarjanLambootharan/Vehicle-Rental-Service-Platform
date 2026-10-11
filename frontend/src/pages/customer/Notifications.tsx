import { useEffect, useState } from "react";
import { CheckCheck, X } from "lucide-react";
import { notificationsApi } from "../../api/services";
import { useResource } from "../../hooks/useResource";
import {
  EmptyState,
  PageHeader,
  ResourceView,
  useFeedback,
} from "../../components/common/UI";
import { date } from "../../utils/format";
export default function Notifications() {
  const resource = useResource(notificationsApi.list),
    feedback = useFeedback(),
    [busy, setBusy] = useState(false);
  const { reload } = resource;
  useEffect(() => {
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);
  const changed = () => {
    reload();
    window.dispatchEvent(new Event("traveler:notifications-changed"));
  };
  async function read(id?: string) {
    if (busy) return;
    setBusy(true);
    try {
      if (id) await notificationsApi.read(id);
      else await notificationsApi.readAll();
      changed();
      feedback.toast(
        id
          ? "Notification marked as read."
          : "All notifications marked as read.",
      );
    } catch (e) {
      feedback.toast(
        e instanceof Error ? e.message : "Unable to update notifications.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Your notification centre"
        title="Notifications"
        description="Booking updates, payment activity and the details that matter."
      />
      <ResourceView resource={resource}>
        {(rows) =>
          rows.length ? (
            <>
              <div className="toolbar">
                <span>
                  {rows.filter((n) => !n.read).length} unread · Refreshes every
                  30 seconds
                </span>
                <div className="actions">
                  <button
                    className="btn secondary small"
                    disabled={busy || rows.every((n) => n.read)}
                    onClick={() => read()}
                  >
                    <CheckCheck size={16} /> Mark all read
                  </button>
                  <button
                    className="text-button danger-text"
                    onClick={() =>
                      feedback.confirm({
                        title: "Dismiss all notifications?",
                        message:
                          "These notifications will be hidden permanently. Related bookings and payments are unchanged.",
                        action: "Dismiss all",
                        run: async () => {
                          await notificationsApi.dismissAll();
                          changed();
                          feedback.toast("Notifications dismissed.");
                        },
                      })
                    }
                  >
                    Dismiss all
                  </button>
                </div>
              </div>
              <div className="notification-list">
                {rows.map((n) => (
                  <article
                    className={`notification-item ${n.read ? "" : "unread"}`}
                    key={n.id}
                  >
                    <span className="read-indicator" />
                    <div>
                      <span className="eyebrow">{date(n.createdAt)}</span>
                      <h3>{n.title}</h3>
                      <p>{n.message}</p>
                      {!n.read && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => read(n.id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Dismiss ${n.title}`}
                      onClick={() =>
                        feedback.confirm({
                          title: "Dismiss this notification?",
                          message:
                            "This hides the notification permanently. Its related business record is retained.",
                          action: "Dismiss",
                          run: async () => {
                            await notificationsApi.dismiss(n.id);
                            changed();
                          },
                        })
                      }
                    >
                      <X size={17} />
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="All caught up."
              description="Updates from your rental activity will appear here."
            />
          )
        }
      </ResourceView>
    </>
  );
}
