import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, Navigation } from "lucide-react";
import { authRedirect } from "../../utils/authRedirect";
import { ApiError } from "../../api/client";
import { editorialHero } from "../../assets/vehicleMedia";
import { authApi } from "../../api/services";
import { useAuth } from "../../contexts/AuthContext";
import { Field, Form, Submit, value } from "../../components/common/UI";
export default function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="wrap auth-layout">
      <section className="auth-intro">
        <img className="auth-photo" src={editorialHero} alt="" />
        <span className="eyebrow">TRAVELER · MADE FOR THE ROAD AHEAD</span>
        <h1>
          {register ? (
            <>
              Your next journey
              <br />
              starts with you.
            </>
          ) : (
            <>
              Welcome <br />
              back.
            </>
          )}
        </h1>
        <p>
          New places. Familiar faces.
          <br />A better way to get there.
        </p>
        <span className="auth-monogram" aria-hidden="true">
          <Navigation size={100} strokeWidth={1} />
        </span>
      </section>
      <section className="auth-form">
        <span className="eyebrow">
          {register ? "Become part of the journey" : "Your personal space"}
        </span>
        <h2>{register ? "Create your account" : "Sign in to Traveler"}</h2>
        <p className="muted">
          {register
            ? "Your bookings, payments and travel plans in one place."
            : "Customers and administrators sign in here."}
        </p>
        {auth.expired && (
          <p className="notice" role="status">
            Your session has ended. Sign in again to continue.
          </p>
        )}
        <Form
          className="form-grid"
          onSave={async (f) => {
            const password = String(f.get("password") || "");
            if (register && new TextEncoder().encode(password).length > 72)
              throw new Error("Password must be at most 72 UTF-8 bytes.");
            let response;
            try {
              response = register
                ? await authApi.register({
                    fullName: value(f, "fullName"),
                    email: value(f, "email"),
                    phone: value(f, "phone"),
                    password,
                  })
                : await authApi.login({ email: value(f, "email"), password });
            } catch (error) {
              if (
                !register &&
                error instanceof ApiError &&
                error.status === 401
              )
                throw new Error(
                  "Email or password is incorrect, or this account is inactive.",
                );
              throw error;
            }
            const identity = await auth.accept(response);
            const from = (location.state as { from?: string } | null)?.from;
            navigate(authRedirect(identity.role, from), { replace: true });
          }}
        >
          {(busy) => (
            <>
              {register && (
                <div className="full">
                  <Field
                    name="fullName"
                    label="Full name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </div>
              )}
              <div className="full">
                <Field
                  name="email"
                  label="Email address"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </div>
              {register && (
                <div className="full">
                  <Field
                    name="phone"
                    label="Phone number"
                    type="tel"
                    autoComplete="tel"
                    required
                    minLength={7}
                    maxLength={25}
                    pattern="[+0-9 ()\-]{7,25}"
                  />
                </div>
              )}
              <div className="full">
                <Field
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                  minLength={register ? 12 : undefined}
                  maxLength={register ? 72 : undefined}
                  hint={
                    register
                      ? "12–72 characters, at most 72 UTF-8 bytes."
                      : undefined
                  }
                />
                <button
                  type="button"
                  className="text-button password-toggle"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>
              <div className="full">
                <Submit busy={busy}>
                  {register ? "Create account" : "Sign in"}
                </Submit>
              </div>
            </>
          )}
        </Form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to the journey?"}{" "}
          <Link to={register ? "/login" : "/register"} state={location.state}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </div>
  );
}
