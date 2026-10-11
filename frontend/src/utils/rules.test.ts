import { describe, expect, it } from "vitest";
import {
  canCancel,
  canEditBooking,
  canPay,
  canStart,
  canStartMaintenance,
} from "./rules";
import { afterDate, rentalDays, today } from "./format";
import type { Booking, Maintenance, Payment } from "../types/api";
const day = "2030-01-10";
const booking = {
  id: "b",
  status: "CONFIRMED",
  rentalPeriod: { pickupDate: "2030-01-11", returnDate: "2030-01-14" },
} as Booking;
const payment = (status: Payment["status"]) =>
  ({ bookingId: "b", status }) as Payment;
describe("backend-aligned action hints", () => {
  it("only cancels future confirmed bookings or resumes pending cancellation", () => {
    expect(canCancel(booking, day)).toBe(true);
    expect(canCancel(booking, "2030-01-11")).toBe(false);
    expect(canCancel({ ...booking, status: "ACTIVE" }, day)).toBe(false);
    expect(canCancel({ ...booking, status: "CANCELLATION_PENDING" }, day)).toBe(
      true,
    );
  });
  it("blocks date edits with pending or paid attempts", () => {
    expect(canEditBooking(booking, [], day)).toBe(true);
    expect(canEditBooking(booking, [payment("PENDING")], day)).toBe(false);
    expect(canEditBooking(booking, [payment("PAID")], day)).toBe(false);
    expect(canEditBooking(booking, [payment("FAILED")], day)).toBe(true);
  });
  it("prevents duplicate current or refunded payments", () => {
    for (const status of ["PENDING", "PAID", "REFUNDED"] as const)
      expect(canPay(booking, [payment(status)])).toBe(false);
    expect(canPay(booking, [payment("VOIDED")])).toBe(true);
    expect(canPay({ ...booking, status: "COMPLETED" }, [])).toBe(false);
  });
  it("requires payment and a half-open rental interval to start", () => {
    expect(canStart(booking, [payment("PAID")], day)).toBe(false);
    expect(canStart(booking, [payment("PAID")], "2030-01-11")).toBe(true);
    expect(canStart(booking, [payment("PAID")], "2030-01-14")).toBe(false);
    expect(canStart(booking, [], "2030-01-11")).toBe(false);
  });
  it("starts only scheduled maintenance inside its interval", () => {
    const m = {
      status: "SCHEDULED",
      startDate: day,
      endDate: "2030-01-12",
    } as Maintenance;
    expect(canStartMaintenance(m, day)).toBe(true);
    expect(canStartMaintenance(m, "2030-01-12")).toBe(false);
    expect(canStartMaintenance({ ...m, status: "COMPLETED" }, day)).toBe(false);
  });
  it("counts exclusive return dates across month and year boundaries", () => {
    expect(rentalDays("2030-12-31", "2031-01-02")).toBe(2);
    expect(afterDate("2030-12-31")).toBe("2031-01-01");
    expect(rentalDays(day, day)).toBe(0);
  });
  it("uses the configured business timezone, not browser UTC date", () => {
    expect(today(new Date("2030-01-10T20:00:00Z"))).toBe("2030-01-11");
  });
});
