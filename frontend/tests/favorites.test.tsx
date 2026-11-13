import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { FavoriteButton } from "../src/components/ui";
import { MyFavorites } from "../src/features/favorites/Favorites";
import { encode } from "../src/services/codec";
import { sessionStore } from "../src/services/api";
import type { Vehicle } from "../src/types";

const vehicle = {
  id: "vehicle-1", brand: "Toyota", model: "Prius", type: "CAR", status: "AVAILABLE",
  dailyRate: 8500, registrationNumber: "CAR-1234", passengerCapacity: 4, seats: 4,
  transmission: "Automatic", engineCapacityCc: null, description: "", rentalGuidance: "",
  createdAt: "2030-01-01T00:00:00Z", updatedAt: "2030-01-01T00:00:00Z",
} as Vehicle;

function customer() {
  sessionStore.set({ accessToken: "customer-token", tokenType: "Bearer", expiresIn: 3600, user: { id: "customer-1", fullName: "Customer", email: "customer@example.test", phone: "0700000000", role: "CUSTOMER", active: true } });
}
function wrap(node: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
}
function response(value: unknown, status = 200) {
  return Promise.resolve(new Response(encode(value), { status }));
}
afterEach(() => { sessionStore.set(null); vi.unstubAllGlobals(); });

it("adds a customer favourite with the vehicle ID and does not duplicate the request", async () => {
  customer();
  const fetch = vi.fn((input: string, init?: RequestInit) =>
    init?.method === "POST" ? response({ id: "favorite-1", vehicleId: vehicle.id, vehicleStatus: "AVAILABLE", createdAt: "2030-01-01T00:00:00Z" }, 201) : response([]),
  );
  vi.stubGlobal("fetch", fetch);
  wrap(<FavoriteButton vehicle={vehicle} />);
  const button = await screen.findByRole("button", { name: "Add Toyota Prius to favourites" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(fetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toHaveLength(1));
  const [, init] = fetch.mock.calls.find(([, request]) => (request as RequestInit | undefined)?.method === "POST")!;
  expect(String((init as RequestInit).body)).toContain("vehicleId");
  expect(String((init as RequestInit).body)).toContain(vehicle.id);
});

it("removes the Favourite record, not the vehicle", async () => {
  customer();
  const favorite = { id: "favorite-9", vehicleId: vehicle.id, vehicleStatus: "AVAILABLE", createdAt: "2030-01-01T00:00:00Z" };
  const fetch = vi.fn((input: string, init?: RequestInit) => init?.method === "DELETE" ? Promise.resolve(new Response(null, { status: 204 })) : response([favorite]));
  vi.stubGlobal("fetch", fetch);
  wrap(<FavoriteButton vehicle={vehicle} />);
  fireEvent.click(await screen.findByRole("button", { name: "Remove Toyota Prius from favourites" }));
  expect(screen.getByText(/will not delete the vehicle or affect existing bookings/i)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Remove from Favourites" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/favorites/favorite-9"), expect.objectContaining({ method: "DELETE" })));
  expect(fetch.mock.calls.map(([url]) => String(url))).not.toContainEqual(expect.stringContaining("/vehicles/vehicle-1"));
});

it("sends a guest to sign in and does not call favourite APIs", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/vehicles/vehicle-1"]}><Routes><Route path="vehicles/:id" element={<FavoriteButton vehicle={vehicle} />} /><Route path="signin" element={<div>Sign in first</div>} /></Routes></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Sign in to add Toyota Prius to favourites" }));
  expect(await screen.findByText("Sign in first")).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});

it("does not show or request customer favourites for an administrator", () => {
  sessionStore.set({ accessToken: "admin-token", tokenType: "Bearer", expiresIn: 3600, user: { id: "admin-1", fullName: "Admin", email: "admin@example.test", phone: "0700000000", role: "ADMIN", active: true } });
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  wrap(<FavoriteButton vehicle={vehicle} />);
  expect(screen.queryByRole("button", { name: /favourites/i })).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it("renders saved vehicle data and safely handles an unavailable vehicle", async () => {
  customer();
  const favorites = [
    { id: "favorite-1", vehicleId: vehicle.id, vehicleStatus: "AVAILABLE", createdAt: "2030-01-01T00:00:00Z" },
    { id: "favorite-gone", vehicleId: "vehicle-gone", vehicleStatus: "INACTIVE", createdAt: "2030-01-01T00:00:00Z" },
  ];
  vi.stubGlobal("fetch", vi.fn((input: string) => {
    if (input.endsWith("/favorites")) return response(favorites);
    if (input.endsWith("/vehicles")) return response([vehicle]);
    if (input.includes("/images")) return response([]);
    return response({ code: "NOT_FOUND", message: "Not found" }, 404);
  }));
  wrap(<MyFavorites />);
  expect(await screen.findByText("Toyota Prius")).toBeVisible();
  expect(screen.getByText("Saved vehicle unavailable")).toBeVisible();
  expect(screen.getByText(/currently unavailable or no longer listed/i)).toBeVisible();
});
