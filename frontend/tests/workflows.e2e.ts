import { encodeText, decodeText } from "../src/api/text";
import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AuthResponse, Booking, Payment, Vehicle } from "../src/types/api";
test.describe.configure({ mode: "serial" });
const runtimeErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  runtimeErrors.length = 0;
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().includes("/api/v1/") || !request.postData()) return;
    if (
      !request.headers()["content-type"]?.startsWith("text/plain") ||
      !request.postData()?.startsWith("TRAVELER-TEXT-1\n")
    )
      runtimeErrors.push("Application request did not use plain text");
  });
  page.on("response", (response) => {
    if (
      response.url().includes("/api/v1/") &&
      response.headers()["content-type"]?.includes("application/json")
    )
      runtimeErrors.push("Application response used JSON");
  });
});
test.afterEach(() => {
  expect(runtimeErrors, "No uncaught browser runtime errors").toEqual([]);
});
const adminPassword = randomBytes(24).toString("base64url");
const customerPassword = randomBytes(24).toString("base64url");
const adminEmail = "admin@vrs-test.example",
  customerEmail = "customer@vrs-test.example";
let server: ChildProcess,
  temporary: string,
  adminToken: string,
  customerToken: string,
  customerId: string,
  vehicleId: string,
  futureBooking: string,
  currentBooking: string;
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Colombo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const plus = (n: number) =>
  new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
async function api<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch("http://127.0.0.1:18080/api/v1" + endpoint, {
    method,
    headers: {
      "Content-Type": "text/plain",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : encodeText(body),
  });
  if (!res.ok)
    throw new Error(`${method} ${endpoint}: ${res.status} ${await res.text()}`);
  return res.status === 204
    ? (undefined as T)
    : decodeText<T>(await res.text());
}
async function login(page: Page, admin = false) {
  await page.goto("/login");
  await page
    .getByLabel("Email address")
    .fill(admin ? adminEmail : customerEmail);
  await page
    .getByLabel("Password", { exact: true })
    .fill(admin ? adminPassword : customerPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(admin ? "/admin" : "/dashboard");
}
async function confirm(page: Page, action: string) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: action, exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test.beforeAll(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), "vrs-frontend-e2e-"));
  const root = path.resolve(".."),
    java =
      process.env.VRS_TEST_JAVA ||
      path.join(root, ".tools/jdk-21.0.12.1+1/bin/java.exe");
  server = spawn(
    java,
    ["-jar", path.join(root, "backend/target/vehicle-rental-1.0.0.jar")],
    {
      cwd: path.join(root, "backend"),
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        APP_STORAGE_PATH: path.join(temporary, "runtime"),
        ADMIN_EMAIL: adminEmail,
        ADMIN_PASSWORD: adminPassword,
        TOKEN_SECRET: randomBytes(32).toString("base64"),
        SERVER_PORT: "18080",
        FRONTEND_ORIGIN: "http://127.0.0.1:15173",
        APP_BUSINESS_TIMEZONE: "Asia/Colombo",
        MOCK_PAYMENT_SUCCESS: "true",
      },
    },
  );
  for (let i = 0; i < 80; i++) {
    try {
      const result = await api<AuthResponse>("POST", "/auth/login", {
        email: adminEmail,
        password: adminPassword,
      });
      adminToken = result.accessToken;
      return;
    } catch {
      if (server.exitCode !== null)
        throw new Error("Disposable backend exited before becoming ready.");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Disposable backend did not start.");
});
test.afterAll(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise<void>((resolve) => {
      server.once("exit", () => resolve());
      setTimeout(resolve, 10000);
    });
  }
  if (temporary) {
    const target = path.resolve(temporary);
    if (
      path.dirname(target) !== path.resolve(tmpdir()) ||
      !path.basename(target).startsWith("vrs-frontend-e2e-")
    )
      throw new Error(
        "Refusing to clean a path outside the disposable test directory.",
      );
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }
});

test("public routes, empty catalogue, filters, mobile layout and access guards", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Great journeys/ }),
  ).toBeVisible();
  await expect(page.getByText("New journeys are on the way.")).toBeVisible();
  await page.waitForFunction(
    () =>
      (document.querySelector(".hero-photo img") as HTMLImageElement)
        ?.naturalWidth > 0,
  );
  for (const section of await page
    .locator(".section-heading, .steps article, .closing")
    .all())
    await section.scrollIntoViewIfNeeded();
  await page.locator("#categories").scrollIntoViewIfNeeded();
  await expect(
    page.locator(".desktop-nav").getByText("Categories"),
  ).toHaveClass(/active/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.goto("/admin/vehicles/new");
  await expect(page).toHaveURL("/login");
  await page.goto("/vehicles");
  await expect(
    page.getByRole("heading", { name: "Browse vehicles" }),
  ).toBeVisible();
  await page.getByLabel("Pick-up date").fill(plus(5));
  await page.getByLabel("Return date").fill(plus(4));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL("/vehicles");
  await page.getByLabel("Pick-up date").fill(plus(3));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("pickupDate=" + plus(3)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close menu" }).click();
  for (const section of await page
    .locator(".section-heading, .steps article, .closing")
    .all())
    await section.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});
test("admin creates, edits, deactivates and restores a real vehicle", async ({
  page,
}) => {
  await login(page, true);
  await page.goto("/admin/vehicles/new");
  await page.getByLabel("Registration number").fill("VRS-TEST-01");
  await page.getByLabel("Brand", { exact: true }).fill("Toyota");
  await page.getByLabel("Model", { exact: true }).fill("Aqua");
  await page.getByLabel("Daily rate (LKR)").fill("7500");
  await page.getByLabel("Transmission").fill("AUTOMATIC");
  await page
    .getByLabel("Description")
    .fill("Disposable integration-test vehicle.");
  await page.getByRole("button", { name: "Add to collection" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Vehicle added to the collection.",
  );
  await expect(page).toHaveURL("/admin/vehicles/new");
  await expect(page.getByLabel("Registration number")).toHaveValue("");
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Description")).toHaveValue("");
  vehicleId = (
    await api<Vehicle[]>("GET", "/vehicles", undefined, adminToken)
  ).find((vehicle) => vehicle.registrationNumber === "VRS-TEST-01")!.id;
  await page.goto(`/admin/vehicles/${vehicleId}/edit`);
  await page.getByLabel("Daily rate (LKR)").fill("8000");
  await page.getByRole("button", { name: "Save vehicle" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Vehicle details saved.",
  );
  await page
    .getByRole("button", { name: "Deactivate vehicle", exact: true })
    .click();
  await confirm(page, "Deactivate vehicle");
  await expect(page.getByLabel("Administrative status")).toHaveValue(
    "INACTIVE",
  );
  await page.getByLabel("Administrative status").selectOption("AVAILABLE");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Vehicle status updated.",
  );
  await page.goto("/admin/vehicles");
  await expect(
    page.getByRole("heading", { name: "Toyota Aqua" }),
  ).toBeVisible();
  await page.goto(`/vehicles/${vehicleId}`);
  await expect(
    page.getByRole("heading", { name: "Toyota Aqua" }),
  ).toBeVisible();
});
test("customer registers, updates profile, books, edits dates and records cash payment", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("VRS Test Customer");
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Phone number").fill("0771234567");
  await page.getByLabel("Password", { exact: true }).fill(customerPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/dashboard");
  const identity = await api<AuthResponse>("POST", "/auth/login", {
    email: customerEmail,
    password: customerPassword,
  });
  customerToken = identity.accessToken;
  customerId = identity.user.id;
  await page.goto("/profile/edit");
  await page.getByLabel("Phone number").fill("0777654321");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/profile");
  await expect(page.getByText("0777654321")).toBeVisible();
  await page.goto(
    `/bookings/new?vehicleId=${vehicleId}&pickupDate=${plus(5)}&returnDate=${plus(7)}`,
  );
  await expect(page.getByLabel("Available vehicle")).toHaveValue(vehicleId);
  await page.getByRole("button", { name: "Confirm reservation" }).click();
  await expect(page).toHaveURL(/\/payments\/new\?bookingId=/);
  futureBooking = new URL(page.url()).searchParams.get("bookingId")!;
  await page.goto(`/bookings/${futureBooking}`);
  await page.getByLabel("Return date", { exact: true }).fill(plus(8));
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Booking dates updated.",
  );
  await page.getByRole("link", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page).toHaveURL(/\/payments\/[^/]+$/);
  await expect(page.locator(".badge")).toContainText("Pending");
  await page.goto("/profile/edit");
  await page.getByRole("button", { name: "Deactivate my account" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Deactivate account", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Resolve protected bookings",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Go back" })
    .click();
  await page.goto("/admin/customers");
  await expect(page).toHaveURL("/forbidden");
});
test("admin records payment, customer cancellation refunds it, notifications persist", async ({
  page,
}) => {
  await login(page, true);
  await page.goto("/admin/payments");
  await page.getByRole("button", { name: "Mark paid", exact: true }).click();
  await confirm(page, "Mark paid");
  await expect(page.locator("tbody .badge")).toContainText("Paid");
  await page.goto("/admin/bookings");
  await expect(
    page.getByRole("link", { name: "Toyota Aqua", exact: true }),
  ).toBeVisible();
  await login(page);
  await page.goto(`/bookings/${futureBooking}`);
  await page
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  await confirm(page, "Cancel booking");
  await expect(page.locator(".panel").first().locator(".badge")).toContainText(
    "Cancelled",
  );
  await page.goto("/payments");
  await expect(page.locator("tbody .badge")).toContainText("Refunded");
  await page.goto("/notifications");
  await expect(page.locator(".notification-item").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page.getByText(/^0 unread .* Refreshes every 30 seconds$/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss all", exact: true }).click();
  await confirm(page, "Dismiss all");
  await expect(
    page.getByRole("heading", { name: "All caught up." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "All caught up." }),
  ).toBeVisible();
});
test("paid rental starts and completes, customer creates edits and hides review", async ({
  page,
}) => {
  const booking = await api<Booking>(
    "POST",
    "/bookings",
    { vehicleId, pickupDate: day, returnDate: plus(1) },
    customerToken,
  );
  currentBooking = booking.id;
  await login(page);
  await page.goto(`/payments/new?bookingId=${currentBooking}`);
  await page.getByLabel("Payment method").selectOption("MOCK_ONLINE");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page).toHaveURL(/\/payments\/[^/]+$/);
  await expect(page.locator(".badge")).toContainText("Paid");
  await login(page, true);
  await page.goto("/admin/bookings");
  await page.getByRole("button", { name: "Start rental", exact: true }).click();
  await confirm(page, "Start rental");
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await confirm(page, "Complete rental");
  await login(page);
  await page.goto(`/reviews/new?bookingId=${currentBooking}`);
  await page.getByLabel("Your rating").selectOption("5");
  await page
    .getByLabel("Your experience")
    .fill("A comfortable and carefully maintained car.");
  await page.getByRole("button", { name: "Share your experience" }).click();
  await expect(page).toHaveURL("/reviews");
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Your experience")
    .fill("An excellent drive and a smooth rental experience.");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page).toHaveURL("/reviews");
  await expect(
    page.getByText("An excellent drive and a smooth rental experience."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide review", exact: true }).click();
  await confirm(page, "Hide review");
  await expect(page.locator("tbody .badge")).toContainText("Hidden");
  await page.goto("/reviews/new");
  await expect(page.getByText("More stories ahead.")).toBeVisible();
});
test("maintenance create, edit, cancel, start and complete; admin moderation and customer access", async ({
  page,
}) => {
  await login(page, true);
  await page.goto("/admin/maintenance/new");
  await page.getByLabel("Vehicle", { exact: true }).selectOption(vehicleId);
  await page.getByLabel("Start date").fill(plus(10));
  await page.getByLabel("End date (exclusive)").fill(plus(11));
  await page.getByLabel("Cost (LKR)").fill("3000");
  await page
    .getByLabel("Maintenance description")
    .fill("Scheduled service inspection.");
  await page.getByRole("button", { name: "Schedule maintenance" }).click();
  await expect(page).toHaveURL(/\/admin\/maintenance\/[^/]+\/edit/);
  await page.getByLabel("Cost (LKR)").fill("3500");
  await page.getByRole("button", { name: "Save maintenance" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Maintenance details saved.",
  );
  await page
    .getByRole("button", { name: "Cancel maintenance", exact: true })
    .click();
  await confirm(page, "Cancel maintenance");
  await expect(page.locator(".badge")).toContainText("Cancelled");
  await page.goto("/admin/maintenance/new");
  await page.getByLabel("Vehicle", { exact: true }).selectOption(vehicleId);
  await page.getByLabel("Start date").fill(day);
  await page.getByLabel("End date (exclusive)").fill(plus(1));
  await page
    .getByLabel("Maintenance description")
    .fill("Post-rental inspection.");
  await page.getByRole("button", { name: "Schedule maintenance" }).click();
  await expect(page).toHaveURL(/\/admin\/maintenance\/[^/]+\/edit/);
  await page
    .getByRole("button", { name: "Start maintenance", exact: true })
    .click();
  await confirm(page, "Start maintenance");
  await page
    .getByRole("button", { name: "Complete maintenance", exact: true })
    .click();
  await confirm(page, "Complete maintenance");
  await expect(page.locator(".badge")).toContainText("Completed");
  await page.goto("/admin/maintenance");
  await expect(page.getByText("Post-rental inspection.")).toBeVisible();
  await page.goto("/admin/reviews");
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review details" }),
  ).toBeVisible();
  await page.goto("/admin/customers");
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Customer details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await confirm(page, "Deactivate");
  await expect(page.locator("tbody .badge")).toContainText("Inactive");
  await page.getByRole("button", { name: "Activate", exact: true }).click();
  await confirm(page, "Activate");
  await expect(page.locator("tbody .badge")).toContainText("Active");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/admin",
    "/admin/customers",
    "/admin/vehicles",
    "/admin/bookings",
    "/admin/payments",
    "/admin/maintenance",
    "/admin/reviews",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/admin-mobile.png",
    fullPage: true,
  });
});
test("all pending payment outcomes, admin review hiding, expired session and network errors", async ({
  page,
}) => {
  for (const outcome of ["FAILED", "VOIDED"] as const) {
    const b = await api<Booking>(
      "POST",
      "/bookings",
      {
        vehicleId,
        pickupDate: plus(outcome === "FAILED" ? 15 : 18),
        returnDate: plus(outcome === "FAILED" ? 16 : 19),
      },
      customerToken,
    );
    await api<Payment>(
      "POST",
      "/payments",
      { bookingId: b.id, paymentMethod: "CASH_ON_PICKUP" },
      customerToken,
    );
    await login(page, true);
    await page.goto("/admin/payments");
    await page
      .getByRole("button", {
        name: outcome === "FAILED" ? "Mark failed" : "Void",
        exact: true,
      })
      .click();
    await confirm(page, outcome === "FAILED" ? "Mark failed" : "Void payment");
    await api("DELETE", `/bookings/${b.id}`, undefined, customerToken);
  }
  const b = await api<Booking>(
    "POST",
    "/bookings",
    { vehicleId, pickupDate: day, returnDate: plus(1) },
    customerToken,
  );
  await api(
    "POST",
    "/payments",
    { bookingId: b.id, paymentMethod: "MOCK_ONLINE" },
    customerToken,
  );
  await api(
    "PATCH",
    `/bookings/${b.id}/status`,
    { status: "ACTIVE" },
    adminToken,
  );
  await api(
    "PATCH",
    `/bookings/${b.id}/status`,
    { status: "COMPLETED" },
    adminToken,
  );
  await api(
    "POST",
    "/reviews",
    {
      bookingId: b.id,
      vehicleId,
      rating: 4,
      comment: "Review moderation test record.",
    },
    customerToken,
  );
  await page.goto("/admin/reviews");
  await page.getByRole("button", { name: "Hide review", exact: true }).click();
  await confirm(page, "Hide review");
  await expect(
    page.locator("tbody .badge").filter({ hasText: "Hidden" }),
  ).toHaveCount(2);
  await page.evaluate(() =>
    sessionStorage.setItem("traveler.accessToken", "expired-test-token"),
  );
  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByText("Your session has ended. Sign in again to continue."),
  ).toBeVisible();
  await page.route("**/api/v1/vehicles", (route) => route.abort());
  await page.goto("/vehicles");
  await expect(page.getByRole("alert")).toContainText(
    "Unable to contact the rental service",
  );
  await page.unroute("**/api/v1/vehicles");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Toyota Aqua" }),
  ).toBeVisible();
  expect((await api<Vehicle[]>("GET", "/vehicles")).length).toBe(1);
  expect(
    (
      await api<{ active: boolean }>(
        "GET",
        `/customers/${customerId}`,
        undefined,
        adminToken,
      )
    ).active,
  ).toBe(true);
});

test("shared sign-in, verified role redirects, homepage hubs, refresh and logout", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to Traveler" }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Email or password is incorrect",
  );
  await page.screenshot({ path: "test-results/sign-in.png", fullPage: true });
  await page.goto("/bookings/new");
  await expect(page).toHaveURL("/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/admin");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Admin dashboard" }),
  ).toBeVisible();
  await expect(page.locator(".status-track")).not.toHaveCount(0);
  await page.screenshot({
    path: "test-results/admin-dashboard.png",
    fullPage: true,
  });
  await page.goto("/");
  await expect(page.locator(".home-hub a")).toHaveCount(8);
  await page
    .locator(".home-hub")
    .getByRole("link", { name: /Maintenance/ })
    .click();
  await expect(page).toHaveURL("/admin/maintenance");
  await expect(
    page.getByRole("heading", { name: "Maintenance records" }),
  ).toBeVisible();
  await page.locator(".account-menu summary").click();
  await page
    .locator(".account-menu")
    .getByRole("button", { name: "Sign out" })
    .click();
  await expect(page).toHaveURL("/login");
  await page.goto("/admin/customers");
  await expect(page).toHaveURL("/login");
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Password", { exact: true }).fill(customerPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.reload();
  await expect(page.locator(".workspace")).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("role", "ADMIN");
    localStorage.setItem("user", "role=ADMIN");
  });
  await page.goto("/admin");
  await expect(page).toHaveURL("/forbidden");
  const response = await fetch("http://127.0.0.1:18080/api/v1/customers", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(response.status).toBe(403);
  await page.goto("/");
  await expect(page.locator(".home-hub a")).toHaveCount(7);
  await page.screenshot({
    path: "test-results/customer-home.png",
    fullPage: true,
  });
  await page
    .locator(".home-hub")
    .getByRole("link", { name: /Book a vehicle/ })
    .click();
  await expect(page).toHaveURL("/bookings/new");
  await page.goto(`/vehicles?pickupDate=${plus(25)}&returnDate=${plus(27)}`);
  await page.getByRole("link", { name: "Book now" }).click();
  await expect(page.getByLabel("Pick-up date")).toHaveValue(plus(25));
  await expect(page.getByLabel("Return date")).toHaveValue(plus(27));
  await page.locator(".account-menu summary").click();
  await page
    .locator(".account-menu")
    .getByRole("button", { name: "Sign out" })
    .click();
  await expect(page).toHaveURL("/login");
  await page.reload();
  await expect(page).toHaveURL("/login");
});

test("motorcycle form, individual notifications, responsive customer screens and self-deactivation", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, true);
  await page.goto("/admin/vehicles/new");
  await page
    .getByLabel("Vehicle type", { exact: true })
    .selectOption("MOTORCYCLE");
  await page.getByLabel("Registration number").fill("VRS-MOTO-01");
  await page.getByLabel("Brand", { exact: true }).fill("Honda");
  await page.getByLabel("Model", { exact: true }).fill("CB150");
  await page.getByLabel("Daily rate (LKR)").fill("3000");
  await page.getByLabel("Engine capacity (cc)").fill("150");
  await page.getByRole("button", { name: "Add to collection" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Vehicle added to the collection.",
  );
  const motoId = (
    await api<Vehicle[]>("GET", "/vehicles", undefined, adminToken)
  ).find((vehicle) => vehicle.registrationNumber === "VRS-MOTO-01")!.id;
  await page.goto(`/admin/vehicles/${motoId}/edit`);
  await expect(page).toHaveURL(/\/admin\/vehicles\/[^/]+\/edit/);
  await page.getByLabel("Engine capacity (cc)").fill("160");
  await page.getByRole("button", { name: "Save vehicle" }).click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Vehicle details saved.",
  );
  await page.getByLabel("Administrative status").selectOption("INACTIVE");
  await page.getByRole("button", { name: "Update status" }).click();
  await confirm(page, "Deactivate vehicle");
  await expect(page.getByLabel("Administrative status")).toHaveValue(
    "INACTIVE",
  );
  await login(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/dashboard",
      "/profile",
      "/profile/edit",
      "/bookings",
      "/payments",
      "/reviews",
      "/notifications",
      "/bookings/new",
      "/payments/new",
      "/reviews/new",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${width}: ${route}`,
      ).toBe(true);
    }
  }
  await page.goto("/notifications");
  await page
    .getByRole("button", { name: "Mark as read", exact: true })
    .first()
    .click();
  await expect(page.locator(".toast[role=status]")).toContainText(
    "Notification marked as read.",
  );
  await page
    .locator(".notification-item")
    .getByRole("button", { name: /^Dismiss / })
    .first()
    .click();
  await confirm(page, "Dismiss");
  await page.goto("/profile/edit");
  await page.getByRole("button", { name: "Deactivate my account" }).click();
  await confirm(page, "Deactivate account");
  await expect(page).toHaveURL("/login");
  expect(
    (
      await api<{ active: boolean }>(
        "GET",
        `/customers/${customerId}`,
        undefined,
        adminToken,
      )
    ).active,
  ).toBe(false);
});
