import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ErrorState, Loading } from "../components/common/UI";
import type { Role } from "../types/api";
export default function ProtectedRoute({ role }: { role?: Role }) {
  const auth = useAuth(),
    location = useLocation();
  if (auth.loading)
    return (
      <div className="wrap public-page">
        <Loading />
      </div>
    );
  if (auth.error)
    return (
      <div className="wrap public-page">
        <ErrorState error={auth.error} retry={() => void auth.refresh()} />
      </div>
    );
  if (!auth.user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (role && auth.user.role !== role)
    return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
