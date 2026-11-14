import { expect, test } from "@playwright/test";
import { encode, decode } from "../../src/services/codec";
import type { AuthResponse, Booking, Payment, Vehicle } from "../../src/types";

const origin =
  (process.env.DRIVELINK_TEST_BACKEND_ORIGIN || "http://127.0.0.1:18081") +
  "/api/v1";
const password = process.env.DRIVELINK_TEST_CUSTOMER_PASSWORD!;
const adminEmail = process.env.DRIVELINK_TEST_ADMIN_EMAIL!;
const adminPassword = process.env.DRIVELINK_TEST_ADMIN_PASSWORD!;
let adminToken = process.env.DRIVELINK_TEST_ADMIN_TOKEN || "";

function date(offset: number) {
  const base = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const value = new Date(base + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date(value + "T00:00:00+05:30"));
}

async function call<T>(path: string, method = "GET", body?: unknown, token = adminToken) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Accept: "text/plain",
      ...(body === undefined
        ? {}
        : { "Content-Type": "text/plain; charset=UTF-8" }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : encode(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${text}`);
  return decode(text) as T;
}

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/signin");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("DL-001 administrator payment context is readable, searchable, protected and responsive", async ({ page }) => {
  if (!adminToken) {
    adminToken = (
      await call<AuthResponse>(
        "/auth/login",
        "POST",
        { email: adminEmail, password: adminPassword },
        "",
      )
    ).accessToken;
  }
  const suffix = String(Date.now());
  const customerName = "DL001 Context Customer";
  const customerEmail = `dl001-context-${suffix}@example.test`;
  const customer = await call<AuthResponse>(
    "/auth/register",
    "POST",
    { fullName: customerName, email: customerEmail, password, phone: "0771234567" },
    "",
  );
  const vehicle = await call<Vehicle>("/vehicles", "POST", {
    type: "CAR",
    registrationNumber: `DL001-${suffix.slice(-6)}`,
    brand: "Context",
    model: "Verifier",
    dailyRate: 4500,
    description: "Disposable DL-001 browser baseline vehicle.",
    seats: 5,
    transmission: "Automatic",
  });
  const booking = await call<Booking>(
    "/bookings",
    "POST",
    { vehicleId: vehicle.id, pickupDate: date(12), returnDate: date(14) },
    customer.accessToken,
  );
  const payment = await call<Payment>(
    "/payments",
    "POST",
    { bookingId: booking.id, paymentMethod: "CASH_ON_PICKUP" },
    customer.accessToken,
  );

  await signIn(page);
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Payments", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: payment.id.slice(0, 8) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Cash on Pickup");
  await expect(row).toContainText(customerName);
  await expect(row).toContainText(customerEmail);
  await expect(row).toContainText("Context Verifier");
  await expect(row).toContainText(dateLabel(booking.rentalPeriod.pickupDate));
  await expect(row).toContainText("Mark failed");
  await page.getByLabel("Search payments").fill(customerEmail);
  await expect(row).toBeVisible();
  await page.getByLabel("Search payments").fill("Context Verifier");
  await expect(row).toBeVisible();
  await page.getByLabel("Search payments").fill(booking.id);
  await expect(row).toBeVisible();
  await page.getByLabel("Search payments").fill(payment.id);
  await expect(row).toBeVisible();
  await page.getByLabel("Search payments").fill("");
  await row.getByRole("button", { name: payment.id.slice(0, 8) }).click();
  const details = page.getByRole("dialog", { name: "Payment details" });
  await expect(details).toContainText(customerName);
  await expect(details).toContainText(customerEmail);
  await expect(details).toContainText(booking.id);
  await expect(details).toContainText("Context Verifier");
  await expect(details).toContainText(dateLabel(booking.rentalPeriod.returnDate));
  await details.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(row.getByRole("button", { name: "Mark failed" })).toBeVisible();
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth)).toBeTruthy();
  const directoryResponse = await fetch(origin + "/customers", {
    headers: { Accept: "text/plain", Authorization: "Bearer " + customer.accessToken },
  });
  expect([401, 403]).toContain(directoryResponse.status);
  await row.getByRole("button", { name: "Mark failed" }).click();
  await page.getByRole("dialog", { name: "Resolve pending payment?" })
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(row.getByText("Failed", { exact: true })).toBeVisible();
});
