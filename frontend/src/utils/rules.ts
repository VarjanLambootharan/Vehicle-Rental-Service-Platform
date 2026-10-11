import type { Booking, Payment, Maintenance } from "../types/api";
import { today } from "./format";
export const currentPayment = (id: string, payments: Payment[]) =>
  payments.some(
    (p) => p.bookingId === id && ["PENDING", "PAID"].includes(p.status),
  );
export const canPay = (b: Booking, payments: Payment[]) =>
  b.status === "CONFIRMED" &&
  !payments.some(
    (p) =>
      p.bookingId === b.id &&
      ["PENDING", "PAID", "REFUNDED"].includes(p.status),
  );
export const canCancel = (b: Booking, day = today()) =>
  b.status === "CANCELLATION_PENDING" ||
  (b.status === "CONFIRMED" && b.rentalPeriod.pickupDate > day);
export const canEditBooking = (
  b: Booking,
  payments: Payment[],
  day = today(),
) =>
  b.status === "CONFIRMED" &&
  b.rentalPeriod.pickupDate > day &&
  !currentPayment(b.id, payments);
export const canStart = (b: Booking, payments: Payment[], day = today()) =>
  b.status === "CONFIRMED" &&
  b.rentalPeriod.pickupDate <= day &&
  day < b.rentalPeriod.returnDate &&
  payments.some((p) => p.bookingId === b.id && p.status === "PAID");
export const canStartMaintenance = (m: Maintenance, day = today()) =>
  m.status === "SCHEDULED" && m.startDate <= day && day < m.endDate;
