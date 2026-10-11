export type Role = "CUSTOMER" | "ADMIN";
export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface Customer extends Entity {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
}
export interface ProfileRequest {
  fullName: string;
  email: string;
  phone: string;
}
export interface RegisterRequest extends ProfileRequest {
  password: string;
}
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: Customer;
}
export type VehicleStatus = "AVAILABLE" | "IN_MAINTENANCE" | "INACTIVE";
export interface VehicleRequest {
  type: "CAR" | "MOTORCYCLE";
  registrationNumber: string;
  brand: string;
  model: string;
  dailyRate: number;
  description: string;
  seats?: number | null;
  transmission?: string | null;
  engineCapacityCc?: number | null;
}
export interface Vehicle extends Entity, VehicleRequest {
  status: VehicleStatus;
  passengerCapacity: number;
  rentalGuidance: string;
}
export type BookingStatus =
  "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLATION_PENDING" | "CANCELLED";
export interface Dates {
  pickupDate: string;
  returnDate: string;
}
export interface Booking extends Entity {
  customerId: string;
  vehicleId: string;
  rentalPeriod: Dates;
  dailyRateSnapshot: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  cancelledAt: string | null;
  cancellationWorkflowId: string | null;
}
export type PaymentStatus =
  "PENDING" | "PAID" | "FAILED" | "VOIDED" | "REFUNDED";
export type PaymentMethod = "CASH_ON_PICKUP" | "MOCK_ONLINE";
export interface Payment extends Entity {
  bookingId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  refundedAt: string | null;
  simulatedRefundReference: string | null;
}
export type MaintenanceStatus =
  "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export interface MaintenanceRequest {
  vehicleId: string;
  description: string;
  startDate: string;
  endDate: string;
  cost: number;
}
export type MaintenanceUpdate = Omit<MaintenanceRequest, "vehicleId"> & {
  status: MaintenanceStatus;
};
export interface Maintenance extends Entity, MaintenanceRequest {
  status: MaintenanceStatus;
}
export interface ReviewRequest {
  bookingId: string;
  vehicleId: string;
  rating: number;
  comment: string;
}
export interface Review extends Entity, ReviewRequest {
  customerId: string;
  deletedAt: string | null;
}
export interface Notification {
  id: string;
  eventId: string;
  recipientUserId: string;
  notificationType: string;
  title: string;
  message: string;
  relatedEntityId: string;
  read: boolean;
  createdAt: string;
  readAt: string | null;
  dismissedAt: string | null;
}
