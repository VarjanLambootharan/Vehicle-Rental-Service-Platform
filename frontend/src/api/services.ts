import { request, query } from "./client";
import type {
  AuthResponse,
  Booking,
  Customer,
  Dates,
  Maintenance,
  MaintenanceRequest,
  MaintenanceUpdate,
  Notification,
  Payment,
  PaymentMethod,
  PaymentStatus,
  ProfileRequest,
  RegisterRequest,
  Review,
  ReviewRequest,
  Vehicle,
  VehicleRequest,
  VehicleStatus,
} from "../types/api";
export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", "POST", body),
  register: (body: RegisterRequest) =>
    request<AuthResponse>("/auth/register", "POST", body),
  me: () => request<Customer>("/auth/me"),
};
export const customersApi = {
  me: () => request<Customer>("/customers/me"),
  update: (body: ProfileRequest) =>
    request<Customer>("/customers/me", "PUT", body),
  deactivate: () => request<void>("/customers/me", "DELETE"),
  list: (q = "") => request<Customer[]>("/customers" + query({ q })),
  get: (id: string) => request<Customer>(`/customers/${id}`),
  active: (id: string, active: boolean) =>
    request<Customer>(`/customers/${id}/active`, "PATCH", { active }),
};
export const vehiclesApi = {
  list: (filters: Record<string, string | number | undefined> = {}) =>
    request<Vehicle[]>("/vehicles" + query(filters)),
  get: (id: string) => request<Vehicle>(`/vehicles/${id}`),
  create: (body: VehicleRequest) => request<Vehicle>("/vehicles", "POST", body),
  update: (id: string, body: VehicleRequest) =>
    request<Vehicle>(`/vehicles/${id}`, "PUT", body),
  status: (id: string, status: VehicleStatus) =>
    request<Vehicle>(`/vehicles/${id}/status`, "PATCH", { status }),
  deactivate: (id: string) => request<void>(`/vehicles/${id}`, "DELETE"),
};
export const bookingsApi = {
  list: (admin = false) =>
    request<Booking[]>(admin ? "/bookings" : "/bookings/me"),
  get: (id: string) => request<Booking>(`/bookings/${id}`),
  create: (body: Dates & { vehicleId: string }) =>
    request<Booking>("/bookings", "POST", body),
  update: (id: string, body: Dates) =>
    request<Booking>(`/bookings/${id}`, "PUT", body),
  cancel: (id: string) => request<Booking>(`/bookings/${id}`, "DELETE"),
  status: (id: string, status: "ACTIVE" | "COMPLETED") =>
    request<Booking>(`/bookings/${id}/status`, "PATCH", { status }),
};
export const paymentsApi = {
  list: (admin = false) =>
    request<Payment[]>(admin ? "/payments" : "/payments/me"),
  get: (id: string) => request<Payment>(`/payments/${id}`),
  create: (bookingId: string, paymentMethod: PaymentMethod) =>
    request<Payment>("/payments", "POST", { bookingId, paymentMethod }),
  status: (
    id: string,
    status: Extract<PaymentStatus, "PAID" | "FAILED" | "VOIDED">,
  ) => request<Payment>(`/payments/${id}/status`, "PATCH", { status }),
  void: (id: string) => request<void>(`/payments/${id}`, "DELETE"),
};
export const maintenanceApi = {
  list: (q = "", vehicleId = "") =>
    request<Maintenance[]>("/maintenance" + query({ q, vehicleId })),
  get: (id: string) => request<Maintenance>(`/maintenance/${id}`),
  create: (body: MaintenanceRequest) =>
    request<Maintenance>("/maintenance", "POST", body),
  update: (id: string, body: MaintenanceUpdate) =>
    request<Maintenance>(`/maintenance/${id}`, "PUT", body),
  cancel: (id: string) => request<void>(`/maintenance/${id}`, "DELETE"),
};
export const reviewsApi = {
  list: (vehicleId = "") =>
    request<Review[]>("/reviews" + query({ vehicleId })),
  mine: () => request<Review[]>("/reviews/me"),
  get: (id: string) => request<Review>(`/reviews/${id}`),
  create: (body: ReviewRequest) => request<Review>("/reviews", "POST", body),
  update: (id: string, body: Pick<ReviewRequest, "rating" | "comment">) =>
    request<Review>(`/reviews/${id}`, "PUT", body),
  hide: (id: string) => request<void>(`/reviews/${id}`, "DELETE"),
};
export const notificationsApi = {
  list: () => request<Notification[]>("/notifications"),
  count: () => request<{ count: number }>("/notifications/unread-count"),
  read: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, "PATCH"),
  readAll: () => request<void>("/notifications/read-all", "PATCH"),
  dismiss: (id: string) => request<void>(`/notifications/${id}`, "DELETE"),
  dismissAll: () => request<void>("/notifications", "DELETE"),
};
