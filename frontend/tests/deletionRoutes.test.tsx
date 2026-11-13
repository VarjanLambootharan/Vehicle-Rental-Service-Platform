import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../src/main";
import { DeletionModal } from "../src/components/ui";
import { encode } from "../src/services/codec";
import { sessionStore } from "../src/services/api";
import type { AuthResponse } from "../src/types";

const customerReceipt = {
  operationId: "operation-customer",
  kind: "VEHICLE",
  targetId: "vehicle-1",
  requestedAt: "2030-01-10T00:00:00Z",
  settlements: [
    {
      paymentId: "payment-customer",
      bookingId: "booking-customer",
      previousStatus: "PAID",
      outcome: "SIMULATED_FULL_REFUND",
      amount: 15000,
      simulatedRefund: 15000,
      reason: "future-booking",
    },
  ],
  notificationCount: 0,
  status: "COMPLETED",
};

const adminReceipt = {
  ...customerReceipt,
  operationId: "operation-admin",
  settlements: [
    ...customerReceipt.settlements,
    {
      paymentId: "payment-other-customer",
      bookingId: "booking-other-customer",
      previousStatus: "PAID",
      outcome: "SIMULATED_FULL_REFUND",
      amount: 22500,
      simulatedRefund: 22500,
      reason: "future-booking",
    },
  ],
  notificationCount: 2,
  actorId: "admin-1",
  reason: "VEHICLE_UNAVAILABLE",
  affectedRecords: { bookings: 2, payments: 2, maintenance: 0, reviews: 0, favourites: 0, images: 0, notificationsRemoved: 1, historicalBookings: 0 },
  simulatedRefundTotal: 37500,
  pendingPaymentVoids: 0,
};

function auth(role: "CUSTOMER" | "ADMIN") {
  sessionStore.set({
    accessToken: `${role.toLowerCase()}-token`,
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      id: `${role.toLowerCase()}-1`,
      fullName: role === "ADMIN" ? "Administrator" : "Customer",
      email: `${role.toLowerCase()}@example.test`,
      phone: "0700000000",
      role,
      active: true,
    },
  } satisfies AuthResponse);
}

function response(value: unknown, status = 200) {
  return Promise.resolve(new Response(encode(value), { status }));
}

function renderRoute(path: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function preview() {
  return {
    kind: "VEHICLE",
    targetId: "vehicle-1",
    targetState: "VEHICLE",
    bookings: 1,
    payments: 1,
    maintenance: 0,
    reviews: 0,
    favourites: 0,
    images: 0,
    notifications: 0,
    simulatedRefundTotal: 15000,
    pendingVoids: 0,
    customerNotifications: 1,
    historicalBookings: 0,
    blocked: false,
    blockers: [],
    alternatives: [],
    impactHash: "impact-hash",
  };
}

function renderModal() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter>
        <DeletionModal
          kind="VEHICLE"
          targetId="vehicle-1"
          title="Delete vehicle"
          reasons={["VEHICLE_UNAVAILABLE"]}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  sessionStore.set(null);
  vi.unstubAllGlobals();
});

describe("deletion routing and receipt navigation", () => {
  it("keeps customer settlements in the customer workspace and uses only customer receipt endpoints", async () => {
    auth("CUSTOMER");
    const fetch = vi.fn((input: string) => {
      if (input.endsWith("/deletions/settlements/mine")) return response([customerReceipt]);
      if (input.endsWith(`/deletions/${customerReceipt.operationId}/receipt`)) return response(customerReceipt);
      return response({ code: "NOT_FOUND", message: "Not found" }, 404);
    });
    vi.stubGlobal("fetch", fetch);

    renderRoute("/account");
    fireEvent.click(await screen.findByRole("link", { name: "My settlements" }));
    expect(await screen.findByRole("heading", { name: "My settlements" })).toBeVisible();
    fireEvent.click(await screen.findByRole("link", { name: "View receipt →" }));
    expect(await screen.findByText((_, element) =>
      element?.textContent === `Operation: ${customerReceipt.operationId}`,
    )).toBeVisible();
    expect(screen.queryByText(/Persisted customer-notification snapshots/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(await screen.findByRole("heading", { name: "My settlements" })).toBeVisible();

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/deletions/${customerReceipt.operationId}/receipt`),
        expect.anything(),
      ),
    );
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContainEqual(
      expect.stringContaining("/deletions/history"),
    );
  }, 10_000);

  it("renders an empty legacy customer receipt safely and reports a missing receipt", async () => {
    auth("CUSTOMER");
    const fetch = vi.fn((input: string) =>
      input.endsWith("/deletions/operation-legacy/receipt")
        ? response({ ...customerReceipt, operationId: "operation-legacy", settlements: [] })
        : response({ code: "NOT_FOUND", message: "Receipt unavailable" }, 404),
    );
    vi.stubGlobal("fetch", fetch);

    const view = renderRoute("/account/settlements/operation-legacy");
    expect(await screen.findByText("No financial settlement was required.")).toBeVisible();
    view.unmount();

    renderRoute("/account/settlements/operation-missing");
    expect(await screen.findByRole("alert")).toHaveTextContent("Receipt unavailable");
  });

  it("does not let a customer open administrator deletion routes", async () => {
    auth("CUSTOMER");
    renderRoute("/admin/deletions/operation-admin");
    expect(await screen.findByText("This workspace is for administrators.")).toBeVisible();
    expect(screen.queryByText("Deletion history")).not.toBeInTheDocument();
  });

  it("places deletion history and receipt navigation in the administrator workspace", async () => {
    auth("ADMIN");
    const fetch = vi.fn((input: string) => {
      if (input.endsWith("/deletions/history")) return response([adminReceipt]);
      if (input.endsWith(`/deletions/${adminReceipt.operationId}/receipt`)) return response(adminReceipt);
      return response({ code: "NOT_FOUND", message: "Not found" }, 404);
    });
    vi.stubGlobal("fetch", fetch);

    renderRoute("/admin");
    fireEvent.click(await screen.findByRole("link", { name: "Deletion history" }));
    expect(await screen.findByRole("heading", { name: "Deletion history" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Deletion history" })).toHaveAttribute("href", "/admin/deletions");
    fireEvent.click(await screen.findByRole("link", { name: "View receipt →" }));
    expect(await screen.findByText((_, element) =>
      element?.textContent === `Operation: ${adminReceipt.operationId}`,
    )).toBeVisible();
    expect(screen.getByText(/Actor:/).parentElement).toHaveTextContent("admin-1");
    expect(screen.getByText(/Reason:/).parentElement).toHaveTextContent("VEHICLE_UNAVAILABLE");
    expect(screen.getByText(/Affected records:/).parentElement).toHaveTextContent("2 bookings, 2 payments");
    expect(screen.getByText((_, element) =>
      element?.textContent === "Persisted customer-notification snapshots: 2",
    )).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(await screen.findByRole("heading", { name: "Deletion history" })).toBeVisible();
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContainEqual(
      expect.stringContaining("/deletions/settlements/mine"),
    );
  });

  it("does not let an administrator open customer settlement routes", async () => {
    auth("ADMIN");
    renderRoute("/account/settlements");
    expect(await screen.findByText("This workspace is for customers.")).toBeVisible();
  });

  it("does not render administrator audit fields in a customer receipt", async () => {
    auth("CUSTOMER");
    vi.stubGlobal("fetch", vi.fn((input: string) =>
      input.endsWith(`/deletions/${customerReceipt.operationId}/receipt`)
        ? response(customerReceipt) : response({ code: "NOT_FOUND", message: "Not found" }, 404),
    ));
    renderRoute(`/account/settlements/${customerReceipt.operationId}`);
    await screen.findByText((_, element) => element?.textContent === `Operation: ${customerReceipt.operationId}`);
    expect(screen.queryByText(/Actor:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument();
  });
});

describe("deletion modal receipt destinations", () => {
  it.each([
    ["CUSTOMER", "/account/settlements/operation-modal"],
    ["ADMIN", "/admin/deletions/operation-modal"],
  ] as const)("uses the %s receipt route returned by the backend", async (role, expectedPath) => {
    auth(role);
    vi.stubGlobal("fetch", vi.fn((input: string, init?: RequestInit) =>
      init?.method === "DELETE" ? response({ operationId: "operation-modal", status: "COMPLETED", appliedFiles: 1, totalFiles: 1 })
        : input.includes("/deletions/preview/") ? response(preview()) : response({}),
    ));
    renderModal();

    expect(await screen.findByText("Simulated refunds:")).toBeVisible();
    expect(screen.getByRole("button", { name: "Permanently delete" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));
    expect(await screen.findByRole("link", { name: "View receipt" })).toHaveAttribute("href", expectedPath);
  });

  it("does not create a receipt link when the backend does not provide an operation id", async () => {
    auth("CUSTOMER");
    vi.stubGlobal("fetch", vi.fn((input: string, init?: RequestInit) =>
      init?.method === "DELETE" ? response({ status: "COMPLETED", appliedFiles: 1, totalFiles: 1 })
        : input.includes("/deletions/preview/") ? response(preview()) : response({}),
    ));
    renderModal();

    await screen.findByText("Simulated refunds:");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));
    expect(await screen.findByText("Deletion completed.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "View receipt" })).not.toBeInTheDocument();
  });

  it("shows a pending deletion truthfully without a receipt link or completion callback", async () => {
    auth("CUSTOMER");
    const onCompleted = vi.fn();
    const operationId = "1dcb1290-7e33-4e26-8f64-46842b8d415b";
    const fetch = vi.fn((input: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? Promise.resolve(new Response(null, { status: 202, headers: { Location: `/api/v1/deletions/${operationId}` } }))
        : input.includes("/deletions/preview/") ? response(preview()) : response({}),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter>
          <DeletionModal kind="VEHICLE" targetId="vehicle-1" title="Delete vehicle" reasons={["VEHICLE_UNAVAILABLE"]} onClose={vi.fn()} onCompleted={onCompleted} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText("Simulated refunds:");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(await screen.findByText("Deletion is still pending.")).toBeVisible();
    expect(screen.queryByText("Deletion completed.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View receipt" })).not.toBeInTheDocument();
    expect(onCompleted).not.toHaveBeenCalled();
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContainEqual(
      expect.stringContaining(`/deletions/${operationId}`),
    );
  });

  it("does not tell a customer to refresh after their own account deletion becomes pending", async () => {
    auth("CUSTOMER");
    const operationId = "1dcb1290-7e33-4e26-8f64-46842b8d415b";
    const fetch = vi.fn((input: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? Promise.resolve(new Response(null, { status: 202, headers: { Location: `/api/v1/deletions/${operationId}` } }))
        : input.includes("/deletions/preview/") ? response({ ...preview(), kind: "CUSTOMER", targetId: "customer-1" }) : response({}),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter>
          <DeletionModal kind="CUSTOMER" targetId="customer-1" title="Delete account" reasons={["CUSTOMER_REQUEST"]} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText("Simulated refunds:");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(await screen.findByText(/account deletion cannot be safely tracked/i)).toBeVisible();
    expect(screen.queryByText(/refresh this page to check progress/i)).not.toBeInTheDocument();
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContainEqual(
      expect.stringContaining(`/deletions/${operationId}`),
    );
  });

  it("prevents a duplicate deletion after an uncertain network outcome", async () => {
    auth("CUSTOMER");
    vi.stubGlobal("fetch", vi.fn((input: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? Promise.reject(new TypeError("Network"))
        : input.includes("/deletions/preview/") ? response(preview()) : response({}),
    ));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter>
          <DeletionModal kind="CUSTOMER" targetId="customer-1" title="Delete account" reasons={["CUSTOMER_REQUEST"]} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText("Simulated refunds:");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(await screen.findByText(/could not confirm the deletion outcome/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Permanently delete" })).toBeDisabled();
    expect(screen.getByText(/private deletion status cannot be checked/i)).toBeVisible();
    expect(screen.queryByText(/refresh or return later/i)).not.toBeInTheDocument();
  });

  it("refreshes the impact and requires a new acknowledgement when the impact changes", async () => {
    auth("ADMIN");
    vi.stubGlobal("fetch", vi.fn((input: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? response({ code: "IMPACT_CHANGED", message: "The deletion impact changed" }, 409)
        : input.includes("/deletions/preview/") ? response(preview()) : response({}),
    ));
    renderModal();

    await screen.findByText("Simulated refunds:");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    expect(await screen.findByText(/review the refreshed impact/i)).toBeVisible();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Permanently delete" })).toBeDisabled();
  });
});
