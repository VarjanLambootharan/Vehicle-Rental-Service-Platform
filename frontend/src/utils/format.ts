import type { Vehicle } from "../types/api";
export const money = (value: number, currency = "LKR") =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
export const shortId = (value: string) => value.slice(0, 8).toUpperCase();
export const vehicleName = (id: string, vehicles: Vehicle[]) => {
  const v = vehicles.find((v) => v.id === id);
  return v ? `${v.brand} ${v.model}` : `Vehicle ${shortId(id)}`;
};
export const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: import.meta.env.VITE_BUSINESS_TIMEZONE || "Asia/Colombo",
      }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value))
    : "—";
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: import.meta.env.VITE_BUSINESS_TIMEZONE || "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function afterDate(value: string, days = 1) {
  return new Date(Date.parse(value + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function rentalDays(from: string, to: string) {
  return (
    Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86400000)) || 0
  );
}
