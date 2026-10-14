import { describe, expect, it } from "vitest";
import { authRedirect } from "./authRedirect";
describe("verified identity redirect", () => {
  it("always sends administrators to their overview", () => {
    expect(authRedirect("ADMIN", "/bookings/new")).toBe("/admin");
  });
  it("preserves a customer booking intent", () => {
    expect(authRedirect("CUSTOMER", "/bookings/new?vehicleId=123")).toBe(
      "/bookings/new?vehicleId=123",
    );
  });
  it("rejects administrator and external return destinations for customers", () => {
    for (const path of [
      "/admin/vehicles",
      "//example.com",
      "https://example.com",
      "/login",
      "/vehicles-other",
      "/\\example.com",
    ])
      expect(authRedirect("CUSTOMER", path)).toBe("/dashboard");
  });
});
