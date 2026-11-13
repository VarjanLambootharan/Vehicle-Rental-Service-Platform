import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { VehicleDetails } from "../src/pages/Marketplace";
import { sessionStore } from "../src/services/api";
import { encode } from "../src/services/codec";
import type { Vehicle } from "../src/types";

const vehicle = {
  id: "vehicle-1",
  registrationNumber: "CAR-CONFLICT",
  brand: "Conflict",
  model: "Guard",
  type: "CAR",
  dailyRate: 7500,
  description: "Disposable test vehicle",
  seats: 5,
  transmission: "AUTO",
  status: "AVAILABLE",
  rentalGuidance: "Choose dates.",
} as Vehicle;

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function renderDetails(pickupDate: string, returnDate: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter
        initialEntries={[
          `/vehicles/${vehicle.id}?pickupDate=${pickupDate}&returnDate=${returnDate}`,
        ]}
      >
        <Routes>
          <Route path="/vehicles/:id" element={<VehicleDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  sessionStore.set(null);
  vi.unstubAllGlobals();
});

it("prevents immediate duplicate booking submission and retains dates after an availability rejection", async () => {
  const pickupDate = futureDate(10);
  const returnDate = futureDate(13);
  let resolveBooking: (response: Response) => void = () => undefined;
  const bookingResponse = new Promise<Response>((resolve) => {
    resolveBooking = resolve;
  });
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith(`/api/v1/vehicles/${vehicle.id}`))
      return Promise.resolve(new Response(encode(vehicle)));
    if (url.endsWith(`/api/v1/vehicles/${vehicle.id}/images`))
      return Promise.resolve(new Response(encode([])));
    if (url.includes("/api/v1/vehicles?"))
      return Promise.resolve(new Response(encode([vehicle])));
    if (url.endsWith("/api/v1/bookings") && init?.method === "POST")
      return bookingResponse;
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetch);
  sessionStore.set({
    accessToken: "customer-token",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      id: "customer-1",
      fullName: "Conflict Customer",
      email: "conflict@example.test",
      phone: "0771234567",
      role: "CUSTOMER",
      active: true,
    },
  });

  renderDetails(pickupDate, returnDate);
  await screen.findByRole("heading", { name: "Conflict Guard" });
  fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
  await screen.findByText("Available for your selected dates.");

  const confirm = screen.getByRole("button", { name: "Confirm booking" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() =>
    expect(
      fetch.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith("/api/v1/bookings") && init?.method === "POST",
      ),
    ).toHaveLength(1),
  );

  resolveBooking(
    new Response(
      encode({
        code: "VEHICLE_UNAVAILABLE",
        message: "Vehicle is unavailable for the requested period",
      }),
      { status: 409 },
    ),
  );
  await screen.findByText("Vehicle is unavailable for the requested period");
  expect(screen.getByLabelText("Pickup date")).toHaveValue(pickupDate);
  expect(screen.getByLabelText("Return date")).toHaveValue(returnDate);
  await waitFor(() => expect(confirm).not.toBeDisabled());
});
