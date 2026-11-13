import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { Images } from "../src/features/admin/Vehicles";
import { Confirm } from "../src/components/ui";
import { encode } from "../src/services/codec";
import { api, sessionStore } from "../src/services/api";
import type { Vehicle } from "../src/types";

const vehicle = { id: "vehicle-1", brand: "Toyota", model: "Prius", type: "CAR", status: "AVAILABLE", dailyRate: 8500, registrationNumber: "CAR-1234", passengerCapacity: 4, seats: 4, transmission: "Automatic", engineCapacityCc: null, description: "", rentalGuidance: "", createdAt: "2030-01-01T00:00:00Z", updatedAt: "2030-01-01T00:00:00Z" } as Vehicle;
function customer() { sessionStore.set({ accessToken: "customer-token", tokenType: "Bearer", expiresIn: 3600, user: { id: "customer-1", fullName: "Customer", email: "customer@example.test", phone: "0700000000", role: "CUSTOMER", active: true } }); }
function admin() { sessionStore.set({ accessToken: "admin-token", tokenType: "Bearer", expiresIn: 3600, user: { id: "admin-1", fullName: "Admin", email: "admin@example.test", phone: "0700000000", role: "ADMIN", active: true } }); }
function wrap(node: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>); }
function response(value: unknown, status = 200) { return Promise.resolve(new Response(encode(value), { status })); }
afterEach(() => { sessionStore.set(null); vi.unstubAllGlobals(); });

it("confirms a selected notification deletion through the authenticated DELETE endpoint", async () => {
  customer();
  const fetch = vi.fn((_input: string, init?: RequestInit) => init?.method === "DELETE" ? Promise.resolve(new Response(null, { status: 204 })) : response({}));
  vi.stubGlobal("fetch", fetch);
  const onConfirm = vi.fn(() => {
    customer();
    return api("/notifications/notice-1", { method: "DELETE", auth: true });
  });
  wrap(<Confirm title="Permanently delete this notification?" pending={false} error={null} destructive confirmLabel="Permanently delete" onClose={vi.fn()} onConfirm={onConfirm}>Deleted events will not regenerate this notification. This is different from marking it as read.</Confirm>);
  expect(screen.getByText(/different from marking it as read/i)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/notifications/notice-1"), expect.objectContaining({ method: "DELETE" })));
});

it("does not submit a destructive confirmation when cancelled", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const onConfirm = vi.fn();
  wrap(<Confirm title="Permanently delete this notification?" pending={false} error={null} destructive onClose={vi.fn()} onConfirm={onConfirm}>This cannot be undone.</Confirm>);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("removes only the selected vehicle image reference and describes its external scope", async () => {
  admin();
  const image = { id: "image-9", vehicleId: vehicle.id, url: "https://example.test/prius.jpg", altText: "Blue Toyota Prius", displayOrder: 0 };
  const fetch = vi.fn((input: string, init?: RequestInit) => init?.method === "DELETE" ? Promise.resolve(new Response(null, { status: 204 })) : response([image]));
  vi.stubGlobal("fetch", fetch);
  wrap(<Images vehicle={vehicle} />);
  fireEvent.click(await screen.findByRole("button", { name: "Permanently delete" }));
  expect(screen.getByText(/hosted image file may remain at its external URL/i)).toBeVisible();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Permanently delete" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/vehicles/vehicle-1/images/image-9"), expect.objectContaining({ method: "DELETE" })));
  expect(fetch.mock.calls.map(([url]) => String(url))).not.toContainEqual(expect.stringContaining("/vehicles/vehicle-1/images/vehicle-1"));
});
