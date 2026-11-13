import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminBookings } from "../src/features/admin/Admin";
import { BookingDetails } from "../src/features/bookings/Bookings";
import { encode } from "../src/services/codec";
import { sessionStore } from "../src/services/api";
import type { Booking, User } from "../src/types";

const customers: User[] = [
  {
    id: "customer-a",
    fullName: "Amina Perera",
    email: "amina@example.test",
    phone: "0771000001",
    role: "CUSTOMER",
    active: true,
  },
  {
    id: "customer-b",
    fullName: "Bimal Silva",
    email: "bimal@example.test",
    phone: "0771000002",
    role: "CUSTOMER",
    active: true,
  },
];

const booking = (
  id: string,
  customerId: string,
  brand: string,
  model: string,
): Booking => ({
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

const bookings = [
  booking("booking-a-reference", "customer-a", "Toyota", "Prius"),
  booking("booking-b-reference", "customer-b", "Honda", "Vezel"),
];

function response(value: unknown, status = 200) {
  return Promise.resolve(new Response(encode(value), { status }));
}

function renderRoutes(path: string, routes: React.ReactNode) {
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
      <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
    </QueryClientProvider>,
  );
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

function customerSession() {
  sessionStore.set({
    accessToken: "customer-token",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: customers[0],
  });
}

afterEach(() => {
  sessionStore.set(null);
  vi.unstubAllGlobals();
});

beforeEach(adminSession);

describe("administrator booking customer visibility", () => {
  it("matches customer names and emails by customer id and searches both fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/bookings")) return response(bookings);
        if (url.endsWith("/customers"))
          return response([customers[1], customers[0]]);
        throw new Error(`Unexpected request ${url}`);
      }),
    );
    renderRoutes(
      "/admin/bookings",
      <Routes>
        <Route path="/admin/bookings" element={<AdminBookings />} />
      </Routes>,
    );

    const aminaRow = (await screen.findByText("Amina Perera")).closest("tr")!;
    const bimalRow = screen.getByText("Bimal Silva").closest("tr")!;
    expect(aminaRow).toHaveTextContent("Toyota Prius");
    expect(aminaRow).toHaveTextContent("amina@example.test");
    expect(bimalRow).toHaveTextContent("Honda Vezel");
    expect(bimalRow).toHaveTextContent("bimal@example.test");

    fireEvent.change(screen.getByLabelText("Search bookings"), {
      target: { value: "Bimal Silva" },
    });
    expect(screen.queryByText("Amina Perera")).not.toBeInTheDocument();
    expect(screen.getByText("Bimal Silva")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Search bookings"), {
      target: { value: "amina@example.test" },
    });
    expect(screen.getByText("Amina Perera")).toBeVisible();
    expect(screen.queryByText("Bimal Silva")).not.toBeInTheDocument();
  });

  it("keeps bookings usable when a customer record is missing or the customer API fails", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bookings")) return response([bookings[0]]);
      if (url.endsWith("/customers"))
        return response({ code: "UNAVAILABLE", message: "Directory unavailable" }, 503);
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    renderRoutes(
      "/admin/bookings",
      <Routes>
        <Route path="/admin/bookings" element={<AdminBookings />} />
      </Routes>,
    );

    expect(
      await screen.findByText("Customer record unavailable"),
    ).toBeVisible();
    expect(screen.getByText(/Reference: customer-a/)).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Customer records could not be loaded",
    );
    expect(screen.getByRole("link", { name: "View & manage →" })).toHaveAttribute(
      "href",
      "/admin/bookings/booking-a-reference",
    );
  });

  it("uses the safe reference fallback when the customer directory no longer contains the owner", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/bookings")) return response([bookings[1]]);
        if (url.endsWith("/customers")) return response([]);
        throw new Error(`Unexpected request ${url}`);
      }),
    );
    renderRoutes(
      "/admin/bookings",
      <Routes>
        <Route path="/admin/bookings" element={<AdminBookings />} />
      </Routes>,
    );

    expect(
      await screen.findByText("Customer record unavailable"),
    ).toBeVisible();
    expect(screen.getByText(/Reference: customer-b/)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the correct customer's details without removing booking actions", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bookings/booking-b-reference"))
        return response(bookings[1]);
      if (url.endsWith("/payments")) return response([]);
      if (url.endsWith("/customers"))
        return response([customers[0], customers[1]]);
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    renderRoutes(
      "/admin/bookings/booking-b-reference",
      <Routes>
        <Route path="/admin/bookings/:id" element={<BookingDetails />} />
      </Routes>,
    );

    expect(await screen.findByRole("heading", { name: "Booked by" })).toBeVisible();
    expect(screen.getByText("Bimal Silva")).toBeVisible();
    expect(screen.getByText("bimal@example.test")).toBeVisible();
    expect(screen.getByText("0771000002")).toBeVisible();
    expect(screen.getByText("customer-b")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Permanently delete booking" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel booking" })).toBeVisible();
  });

  it("does not request or render administrator customer data on customer booking pages", async () => {
    customerSession();
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bookings/booking-a-reference"))
        return response(bookings[0]);
      if (url.endsWith("/payments/me")) return response([]);
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    renderRoutes(
      "/account/bookings/booking-a-reference",
      <Routes>
        <Route path="/account/bookings/:id" element={<BookingDetails />} />
      </Routes>,
    );

    expect(await screen.findByText("Toyota Prius")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Booked by" })).not.toBeInTheDocument();
    expect(screen.queryByText("bimal@example.test")).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls.map(([input]) => String(input))).not.toContainEqual(
      expect.stringContaining("/customers"),
    );
  });
});
