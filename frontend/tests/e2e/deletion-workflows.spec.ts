import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { decode, encode } from "../../src/services/codec";

// These cases intentionally prepare only disposable records through the public API, then perform
// each deletion through the production browser controls. They are not API-delete substitutes.
const origin = (process.env.DRIVELINK_TEST_BACKEND_ORIGIN || "http://127.0.0.1:18081") + "/api/v1";
const adminEmail = process.env.DRIVELINK_TEST_ADMIN_EMAIL!;
const adminPassword = process.env.DRIVELINK_TEST_ADMIN_PASSWORD!;
const customerPassword = process.env.DRIVELINK_TEST_CUSTOMER_PASSWORD!;
let adminToken = process.env.DRIVELINK_TEST_ADMIN_TOKEN || "";
test.setTimeout(90_000);

const day = (offset: number) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(today + "T00:00:00Z"); date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
async function api<T>(path: string, method = "GET", body?: unknown, token = adminToken): Promise<T> {
  const response = await fetch(origin + path, {
    method,
    headers: { Accept: "text/plain", ...(body === undefined ? {} : { "Content-Type": "text/plain; charset=UTF-8" }), ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body === undefined ? undefined : encode(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
  return (response.status === 204 ? undefined : decode(text)) as T;
}
async function status(path: string, token = adminToken) {
  return (await fetch(origin + path, { headers: { Accept: "text/plain", ...(token ? { Authorization: "Bearer " + token } : {}) } })).status;
}
async function signIn(page: Page, email = adminEmail, password = adminPassword, destination = /\/admin$/, returnTo = "/admin") {
  await page.goto("/signin?returnTo=" + encodeURIComponent(returnTo));
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(destination);
}
async function customer(label: string) {
  const id = randomUUID().slice(0, 8);
  const email = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${id}@example.test`;
  return { email, ...(await api<any>("/auth/register", "POST", { fullName: `${label} ${id}`, email, password: customerPassword, phone: "077" + id.replace(/\D/g, "").padEnd(7, "1").slice(0, 7) }, "")) };
}
async function vehicle(label: string) {
  const id = randomUUID().slice(0, 8).toUpperCase();
  return api<any>("/vehicles", "POST", { type: "CAR", registrationNumber: `DEL-${id}`, brand: "Delete", model: label, dailyRate: 15000, description: "Disposable browser deletion fixture", seats: 5, transmission: "Automatic" });
}
async function confirmedBooking(customerAuth: any, car: any, pickup = 12) {
  return api<any>("/bookings", "POST", { vehicleId: car.id, pickupDate: day(pickup), returnDate: day(pickup + 2) }, customerAuth.accessToken);
}
async function completedBooking(customerAuth: any, car: any) {
  const booking = await confirmedBooking(customerAuth, car, 0);
  await api<any>("/payments", "POST", { bookingId: booking.id, paymentMethod: "MOCK_ONLINE" }, customerAuth.accessToken);
  await api<any>(`/bookings/${booking.id}/status`, "PATCH", { status: "ACTIVE" });
  await api<any>(`/bookings/${booking.id}/status`, "PATCH", { status: "COMPLETED" });
  return booking;
}
async function executeMajorDeletion(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("This is permanent.")).toBeVisible();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Permanently delete", exact: true }).click();
  // The server is authoritative. If its just-read plan has changed, exercise the required
  // acknowledgement reset once rather than claiming success from a stale preview.
  await page.waitForTimeout(250);
  if (await dialog.getByText("The deletion impact changed.").isVisible().catch(() => false)) {
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Permanently delete", exact: true }).click();
  }
}

test.beforeAll(async () => {
  if (!adminToken) adminToken = (await api<any>("/auth/login", "POST", { email: adminEmail, password: adminPassword }, "")).accessToken;
});

test("browser vehicle deletion shows preview/reason/acknowledgement and removes only that vehicle", async ({ page }) => {
  const target = await vehicle("Vehicle Target"), untouched = await vehicle("Vehicle Untouched");
  await signIn(page, adminEmail, adminPassword, /\/admin\/vehicles$/, "/admin/vehicles");
  await page.getByLabel("Search vehicles").fill(target.registrationNumber);
  await page.getByRole("row", { name: new RegExp(target.registrationNumber) }).getByRole("button", { name: "Permanently delete" }).click();
  await executeMajorDeletion(page);
  await expect.poll(() => status(`/vehicles/${target.id}`)).toBe(404);
  expect(await status(`/vehicles/${untouched.id}`)).toBe(200);
});

test("browser booking deletion uses the customer-scoped preview flow", async ({ page }) => {
  const owner = await customer("Booking delete"), car = await vehicle("Booking Target"), booking = await confirmedBooking(owner, car);
  await signIn(page, adminEmail, adminPassword, new RegExp(`/admin/bookings/${booking.id}$`), `/admin/bookings/${booking.id}`);
  await page.getByRole("button", { name: "Permanently delete booking" }).click();
  await executeMajorDeletion(page);
  await expect.poll(() => status(`/bookings/${booking.id}`)).toBe(404);
});

test("browser payment deletion preserves the completed-rental eligibility rule", async ({ page }) => {
  const owner = await customer("Payment delete"), car = await vehicle("Payment Target"), booking = await completedBooking(owner, car);
  const payment = await api<any[]>("/payments").then((all) => all.find((entry) => entry.bookingId === booking.id));
  await signIn(page, adminEmail, adminPassword, /\/admin\/payments$/, "/admin/payments");
  await page.getByLabel("Search payments").fill(payment.id);
  await page.getByRole("row", { name: new RegExp(payment.id.slice(0, 8)) }).getByRole("button", { name: "Permanently delete" }).click();
  await executeMajorDeletion(page);
  await expect.poll(() => status(`/payments/${payment.id}`)).toBe(404);
});

test("browser maintenance deletion confirms the exact scheduled record", async ({ page }) => {
  const car = await vehicle("Maintenance Target");
  const record = await api<any>("/maintenance", "POST", { vehicleId: car.id, description: "Browser deletion maintenance " + car.id, startDate: day(20), endDate: day(22), cost: 1000 });
  await signIn(page, adminEmail, adminPassword, /\/admin\/maintenance$/, "/admin/maintenance");
  const card = page.locator("article", { hasText: record.description });
  await card.getByRole("button", { name: "Permanently delete" }).click();
  await executeMajorDeletion(page);
  await expect.poll(() => status(`/maintenance/${record.id}`)).toBe(404);
});

test("browser review deletion keeps the major confirmation path and removes only the review", async ({ page }) => {
  const owner = await customer("Review delete"), car = await vehicle("Review Target"), booking = await completedBooking(owner, car);
  const review = await api<any>("/reviews", "POST", { bookingId: booking.id, vehicleId: car.id, rating: 5, comment: "Browser deletion review " + car.id }, owner.accessToken);
  await signIn(page, adminEmail, adminPassword, /\/admin\/reviews$/, "/admin/reviews");
  const card = page.locator("article", { hasText: review.comment });
  await card.getByRole("button", { name: "Permanently delete" }).click();
  await executeMajorDeletion(page);
  await expect.poll(() => status(`/reviews/${review.id}`)).toBe(404);
});

test("browser notification deletion uses its recipient record identifier and confirmation", async ({ page }) => {
  const owner = await customer("Notice delete"), car = await vehicle("Notice Target");
  await confirmedBooking(owner, car);
  const notices = await api<any[]>("/notifications", "GET", undefined, owner.accessToken);
  expect(notices.length).toBeGreaterThan(0);
  await signIn(page, owner.email, customerPassword, /\/account\/notifications$/, "/account/notifications");
  await page.getByLabel("Permanently delete: " + notices[0].title).click();
  await page.getByRole("dialog").getByRole("button", { name: "Permanently delete", exact: true }).click();
  await expect.poll(async () => (await api<any[]>("/notifications", "GET", undefined, owner.accessToken)).some((n) => n.id === notices[0].id)).toBe(false);
});

test("browser favourite removal deletes the favourite association, not the vehicle", async ({ page }) => {
  const owner = await customer("Favourite delete"), car = await vehicle("Favourite Target");
  const favourite = await api<any>("/favorites", "POST", { vehicleId: car.id }, owner.accessToken);
  await signIn(page, owner.email, customerPassword, /\/account\/favorites$/, "/account/favorites");
  await page.getByRole("button", { name: `Remove ${car.brand} ${car.model} from favourites` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove from Favourites" }).click();
  await expect.poll(async () => (await api<any[]>("/favorites", "GET", undefined, owner.accessToken)).some((item) => item.id === favourite.id)).toBe(false);
  expect(await status(`/vehicles/${car.id}`)).toBe(200);
});

test("browser vehicle-image removal identifies the selected gallery reference", async ({ page }) => {
  const car = await vehicle("Image Target");
  const image = await api<any>(`/vehicles/${car.id}/images`, "POST", { url: "https://example.test/browser-delete-image.jpg", altText: "Browser deletion image", displayOrder: 0 });
  await signIn(page, adminEmail, adminPassword, /\/admin\/vehicles$/, "/admin/vehicles");
  await page.getByLabel("Search vehicles").fill(car.registrationNumber);
  await page.getByRole("row", { name: new RegExp(car.registrationNumber) }).getByRole("button", { name: "Images" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Permanently delete" }).click();
  const confirmation = page.getByRole("dialog").last();
  await expect(confirmation).toContainText("stored image reference");
  await confirmation.getByRole("button", { name: "Permanently delete", exact: true }).click();
  await expect.poll(async () => (await api<any[]>(`/vehicles/${car.id}/images`)).some((item) => item.id === image.id)).toBe(false);
});

test("browser customer account deletion signs out after a confirmed eligible deletion on mobile", async ({ page }) => {
  const owner = await customer("Account delete");
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, owner.email, customerPassword, /\/account\/profile$/, "/account/profile");
  await page.getByRole("button", { name: "Permanently delete my account" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Permanently delete", exact: true }).click();
  await expect(page).toHaveURL(/\/signin/);
  expect(await status(`/customers/${owner.user.id}`, owner.accessToken)).toBe(401);
});
