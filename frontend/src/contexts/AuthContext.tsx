import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/services";
import { ApiError, session } from "../api/client";
import type { AuthResponse, Customer } from "../types/api";
interface AuthState {
  user: Customer | null;
  loading: boolean;
  error: string;
  expired: boolean;
  accept: (response: AuthResponse) => Promise<Customer>;
  logout: () => void;
  refresh: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [expired, setExpired] = useState(false);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      if (session.get()) setUser(await authApi.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) session.clear();
      else
        setError(
          e instanceof Error ? e.message : "Unable to verify your session.",
        );
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    const expire = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener("traveler:session-expired", expire);
    return () => window.removeEventListener("traveler:session-expired", expire);
  }, []);
  async function accept(response: AuthResponse) {
    session.set(response.accessToken);
    try {
      const identity = await authApi.me();
      setUser(identity);
      setExpired(false);
      setError("");
      return identity;
    } catch (e) {
      session.clear();
      throw e;
    }
  }
  function logout() {
    session.clear();
    setUser(null);
    setError("");
    setExpired(false);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, expired, accept, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider missing");
  return context;
}
