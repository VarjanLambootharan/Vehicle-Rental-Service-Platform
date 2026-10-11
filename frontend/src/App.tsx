import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Layout, Workspace } from "./components/layout/Layout";
import { Loading, PageHeader } from "./components/common/UI";
import ProtectedRoute from "./routes/ProtectedRoute";
const Home = lazy(() => import("./pages/public/Home"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const Catalogue = lazy(() => import("./pages/vehicle/Catalogue"));
const VehicleDetails = lazy(() => import("./pages/vehicle/VehicleDetails"));
const VehicleForm = lazy(() => import("./pages/vehicle/VehicleForm"));
const Profile = lazy(() => import("./pages/customer/Profile"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const Dashboard = lazy(() => import("./pages/customer/Dashboard"));
const CreateBooking = lazy(() => import("./pages/booking/CreateBooking"));
const Bookings = lazy(() => import("./pages/booking/Bookings"));
const BookingDetails = lazy(() => import("./pages/booking/BookingDetails"));
const MakePayment = lazy(() => import("./pages/payment/MakePayment"));
const Payments = lazy(() => import("./pages/payment/Payments"));
const PaymentDetails = lazy(() =>
  import("./pages/payment/Payments").then((m) => ({
    default: m.PaymentDetails,
  })),
);
const MaintenanceRecords = lazy(
  () => import("./pages/maintenance/MaintenanceRecords"),
);
const MaintenanceForm = lazy(
  () => import("./pages/maintenance/MaintenanceForm"),
);
const ReviewForm = lazy(() => import("./pages/review/ReviewForm"));
const Reviews = lazy(() => import("./pages/review/Reviews"));
const Notifications = lazy(() => import("./pages/customer/Notifications"));
function Missing({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <div className="wrap public-page">
      <PageHeader
        eyebrow={forbidden ? "403 / A private space" : "404 / A different turn"}
        title={forbidden ? "Access restricted" : "Page not found"}
        description={
          forbidden
            ? "Your account does not have access to this page."
            : "The page you are looking for could not be found."
        }
      />
      <Link className="btn" to="/">
        Return home →
      </Link>
    </div>
  );
}
export default function App() {
  const location = useLocation();
  useEffect(() => {
    document.title = `${
      location.pathname === "/"
        ? "Find your next drive"
        : location.pathname
            .split("/")
            .filter((s) => Boolean(s) && !/^[a-f0-9-]{30,}$/i.test(s))
            .slice(0, 2)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" · ")
    } | Traveler`;
    if (location.hash)
      setTimeout(
        () => document.getElementById(location.hash.slice(1))?.scrollIntoView(),
        250,
      );
  }, [location]);
  return (
    <Suspense
      fallback={
        <div className="wrap public-page">
          <Loading />
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="vehicles" element={<Catalogue />} />
          <Route path="vehicles/:id" element={<VehicleDetails />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route path="forbidden" element={<Missing forbidden />} />
          <Route element={<ProtectedRoute role="CUSTOMER" />}>
            <Route element={<Workspace />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/edit" element={<Profile edit />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/new" element={<CreateBooking />} />
              <Route path="bookings/:id" element={<BookingDetails />} />
              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<MakePayment />} />
              <Route path="payments/:id" element={<PaymentDetails />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="reviews/new" element={<ReviewForm />} />
              <Route path="reviews/:id/edit" element={<ReviewForm />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route element={<Workspace />}>
              <Route path="admin" element={<Dashboard admin />} />
              <Route path="admin/customers" element={<Customers />} />
              <Route path="admin/vehicles" element={<Catalogue admin />} />
              <Route path="admin/vehicles/new" element={<VehicleForm />} />
              <Route path="admin/vehicles/:id/edit" element={<VehicleForm />} />
              <Route path="admin/bookings" element={<Bookings admin />} />
              <Route path="admin/bookings/:id" element={<BookingDetails />} />
              <Route path="admin/payments" element={<Payments admin />} />
              <Route path="admin/payments/:id" element={<PaymentDetails />} />
              <Route
                path="admin/maintenance"
                element={<MaintenanceRecords />}
              />
              <Route
                path="admin/maintenance/new"
                element={<MaintenanceForm />}
              />
              <Route
                path="admin/maintenance/:id/edit"
                element={<MaintenanceForm />}
              />
              <Route path="admin/reviews" element={<Reviews admin />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<Workspace />}>
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Route>
          <Route path="*" element={<Missing />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
