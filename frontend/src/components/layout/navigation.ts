import {
  Bell,
  CalendarDays,
  CarFront,
  CreditCard,
  Home,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
export const customerLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    description: "Your rental activity at a glance",
    Icon: LayoutDashboard,
  },
  {
    to: "/bookings/new",
    label: "Book a vehicle",
    description: "Choose your dates and your next drive",
    Icon: PlusCircle,
  },
  {
    to: "/bookings",
    label: "My bookings",
    description: "View, update or cancel reservations",
    Icon: CalendarDays,
  },
  {
    to: "/payments",
    label: "Payments",
    description: "Payment information and history",
    Icon: CreditCard,
  },
  {
    to: "/reviews",
    label: "My reviews",
    description: "Rate and revisit your completed trips",
    Icon: MessageSquare,
  },
  {
    to: "/profile",
    label: "My profile",
    description: "Manage your personal information",
    Icon: UserRound,
  },
  {
    to: "/notifications",
    label: "Notifications",
    description: "Stay up to date with your rentals",
    Icon: Bell,
  },
];
export const adminLinks = [
  {
    to: "/admin",
    label: "Overview",
    description: "A live overview of your rental service",
    Icon: LayoutDashboard,
  },
  {
    to: "/admin/vehicles",
    label: "Vehicles",
    description: "Manage your fleet and daily rates",
    Icon: CarFront,
  },
  {
    to: "/admin/customers",
    label: "Customers",
    description: "Find customers and manage account access",
    Icon: Users,
  },
  {
    to: "/admin/bookings",
    label: "Bookings",
    description: "Manage reservations and rental statuses",
    Icon: CalendarDays,
  },
  {
    to: "/admin/payments",
    label: "Payments",
    description: "Review and manage payment records",
    Icon: CreditCard,
  },
  {
    to: "/admin/maintenance",
    label: "Maintenance",
    description: "Schedule and track vehicle servicing",
    Icon: Wrench,
  },
  {
    to: "/admin/reviews",
    label: "Reviews",
    description: "Review and moderate customer feedback",
    Icon: MessageSquare,
  },
  {
    to: "/notifications",
    label: "Notifications",
    description: "Your latest account updates",
    Icon: Bell,
  },
];
export const publicLinks = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/vehicles", label: "Browse vehicles", Icon: CarFront },
];
