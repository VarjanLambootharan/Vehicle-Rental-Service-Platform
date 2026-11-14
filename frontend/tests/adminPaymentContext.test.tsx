import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPayments } from "../src/features/admin/Admin";
import { AppRoutes } from "../src/main";
import { encode } from "../src/services/codec";
import { sessionStore } from "../src/services/api";
import type { Booking, Payment, User } from "../src/types";

const customers: User[] = [
  {
    id: "customer-a",
    fullName: "Alex Kim",
    email: "alex.a@example.test",
    phone: "0771000001",
    role: "CUSTOMER",
    active: true,
  },
  {
    id: "customer-b",
    fullName: "Alex Kim",
    email: "alex.b@example.test",
    phone: "0771000002",
    role: "CUSTOMER",
    active: true,
  },
];

const booking = (id: string, customerId: string, brand = "Toyota", model = "Prius"): Booking => ({
  id,
  customerId,
  vehicleId: `vehicle-${id}`,
  vehicleBrand: brand,
  vehicleModel: model,
  vehicleStatus: "AVAILABLE",
  rentalPeriod: { pickupDate: "2099-03-10", returnDate: "2099-03-12" },
  dailyRateSnapshot: 7500,
  totalAmount: 15000,
  currency: "LKR",
  status: "CONFIRMED",
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  cancelledAt: null,
  cancellationWorkflowId: null,
});

const payment = (id: string, bookingId: string, customerId: string): Payment => ({
  id,
  bookingId,
  customerId,
  amount: 15000,
  currency: "LKR",
  paymentMethod: "CASH_ON_PICKUP",
  status: "PENDING",
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  refundedAt: null,
  simulatedRefundReference: null,
});

const bookings = [
  booking("aaaa0001-booking-reference", "customer-a", "Toyota", "Prius"),
  booking("bbbb0002-booking-reference", "customer-b", "Honda", "Vezel"),
];
const payments = [
  payment("11111111-payment-reference", bookings[0].id, "customer-a"),
  payment("22222222-payment-reference", bookings[1].id, "customer-b"),
];

function response(value: unknown, status = 200) {
  return Promise.resolve(new Response(encode(value), { status }));
}

function adminSession() {
  sessionStore.set({
    accessToken: "admin-token",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      id: "admin-1",
      fullName: "Administrator",
      email: "admin@example.test",
      phone: "0770000000",
      role: "ADMIN",
      active: true,
    },
  });
}

function renderPayments() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={["/admin/payments"]}>
        <Routes>
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/bookings/:id" element={<div>Booking route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function paymentFetch({
  customerResponse = customers,
  bookingResponse = bookings,
}: {
  customerResponse?: User[] | { code: string; message: string };
  bookingResponse?: Booking[] | { code: string; message: string };
} = {}) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/payments")) return response(payments);
    if (url.endsWith("/bookings"))
      return response(
        bookingResponse,
        Array.isArray(bookingResponse) ? 200 : 503,
      );
    if (url.endsWith("/customers"))
      return response(
        customerResponse,
        Array.isArray(customerResponse) ? 200 : 503,
      );
    if (url.endsWith("/status") && init?.method === "PATCH") return response(payments[0]);
    throw new Error(`Unexpected request ${url}`);
  });
}

beforeEach(adminSession);
afterEach(() => {
  sessionStore.set(null);
  vi.unstubAllGlobals();
});

describe("administrator payment context", () => {
  it("joins same-name customers, bookings and vehicles by exact IDs in list and details", async () => {
    vi.stubGlobal("fetch", paymentFetch({ customerResponse: [customers[1], customers[0]] }));
    renderPayments();

    const firstRow = (await screen.findByText("alex.a@example.test")).closest("tr")!;
    const secondRow = screen.getByText("alex.b@example.test").closest("tr")!;
    expect(firstRow).toHaveTextContent("Toyota Prius");
    expect(firstRow).toHaveTextContent(bookings[0].id.slice(0, 8));
    expect(firstRow).toHaveTextContent("Mar");
    expect(secondRow).toHaveTextContent("Honda Vezel");
    expect(secondRow).toHaveTextContent(bookings[1].id.slice(0, 8));

    fireEvent.click(screen.getByRole("button", { name: "22222222" }));
    const detail = await screen.findByRole("dialog", { name: "Payment details" });
    expect(detail).toHaveTextContent("alex.b@example.test");
    expect(detail).toHaveTextContent(bookings[1].id);
    expect(detail).toHaveTextContent("Honda Vezel");
    expect(detail).toHaveTextContent("Mar");
  });

  it("searches customer name/email, payment and booking references, and vehicle information", async () => {
    vi.stubGlobal("fetch", paymentFetch());
    renderPayments();
    await screen.findByText("alex.a@example.test");
    const search = screen.getByLabelText("Search payments");

    for (const value of ["alex.b@example.test", payments[0].id, bookings[1].id, "Honda Vezel"]) {
      fireEvent.change(search, { target: { value } });
      expect(screen.getAllByRole("row")).toHaveLength(2);
    }
  });

  it("keeps payment actions available when the customer directory fails and retries safely", async () => {
    let customerAttempts = 0;
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/payments")) return response([payments[0]]);
      if (url.endsWith("/bookings")) return response([bookings[0]]);
      if (url.endsWith("/customers")) {
        customerAttempts += 1;
        return customerAttempts === 1
          ? response({ code: "UNAVAILABLE", message: "Directory unavailable" }, 503)
          : response([customers[0]]);
      }
      if (url.endsWith("/status") && init?.method === "PATCH") return response(payments[0]);
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    renderPayments();

    expect(await screen.findByRole("alert")).toHaveTextContent("Customer records could not be loaded");
    expect(screen.getByText("Customer record unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: "Mark failed" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Permanently delete" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await expect(screen.findByText("alex.a@example.test")).resolves.toBeVisible();
    expect(customerAttempts).toBe(2);
  });

  it("uses surviving references for permanently deleted customers and missing booking or vehicle records", async () => {
    const missingBookingPayment = payment("payment-missing", "booking-missing", "customer-missing");
    const vehicleMissingBooking = booking("booking-vehicle-missing", "customer-a", "", "");
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/payments")) return response([missingBookingPayment, payment("payment-vehicle", vehicleMissingBooking.id, "customer-a")]);
      if (url.endsWith("/bookings")) return response([vehicleMissingBooking]);
      if (url.endsWith("/customers")) return response([customers[0]]);
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    renderPayments();

    expect(await screen.findByText("Customer record unavailable")).toBeVisible();
    expect(screen.getByText("Reference: customer-missing")).toBeVisible();
    expect(screen.getByText("Booking record unavailable")).toBeVisible();
    expect(screen.getAllByText("Vehicle record unavailable")).toHaveLength(2);
    expect(screen.getByText("Rental period unavailable")).toBeVisible();
  });

  it("keeps customer-directory data behind the administrator route guard", async () => {
    sessionStore.set({
      accessToken: "customer-token",
      tokenType: "Bearer",
      expiresIn: 3600,
      user: customers[0],
    });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/payments"]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByRole("heading", { name: "This workspace is for administrators." });
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContain("/api/v1/customers");
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContain("/api/v1/payments");
  });

  it("uses the responsive payment table wrapper without clipping payment controls", async () => {
    vi.stubGlobal("fetch", paymentFetch());
    const view = renderPayments();
    await screen.findByText("alex.a@example.test");
    expect(view.container.querySelector(".payment-records")).toHaveClass("table-wrap");
    expect(screen.getAllByRole("button", { name: "Mark failed" })).toHaveLength(2);
  });
});
