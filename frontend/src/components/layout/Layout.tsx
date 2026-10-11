import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  Compass,
  LogOut,
  Menu,
  Navigation,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { notificationsApi } from "../../api/services";
import { adminLinks, customerLinks, publicLinks } from "./navigation";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Traveler home">
      <span className="brand-symbol">
        <Navigation size={23} strokeWidth={2.8} />
      </span>
      <span>
        Traveler<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Layout() {
  const { user, logout } = useAuth(),
    [open, setOpen] = useState(false),
    [unread, setUnread] = useState<number | null>(null),
    [activeSection, setActiveSection] = useState<string | null>(null);
  const location = useLocation(),
    account = useRef<HTMLDetailsElement>(null);
  const workspace =
    location.pathname.startsWith("/admin") ||
    /^\/(dashboard|profile|bookings|payments|reviews|notifications)(\/|$)/.test(
      location.pathname,
    );
  const links = user?.role === "ADMIN" ? adminLinks : customerLinks;
  useEffect(() => {
    setOpen(false);
    if (account.current) account.current.open = false;
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection(null);
      return;
    }
    const sections = ["availability", "categories", "experience"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => !!section);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        setActiveSection(visible?.target.id ?? null);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.2, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location.pathname]);
  const homeActive = location.pathname === "/" && !activeSection;
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (account.current && !account.current.contains(e.target as Node))
        account.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        if (account.current?.open) {
          account.current.open = false;
          account.current.querySelector("summary")?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const refresh = () =>
      notificationsApi
        .count()
        .then((r) => {
          if (active) setUnread(r.count);
        })
        .catch(() => {
          if (active) setUnread(null);
        });
    void refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("traveler:notifications-changed", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("traveler:notifications-changed", refresh);
    };
  }, [user]);
  return (
    <div className={workspace ? "app-shell workspace-shell" : "app-shell"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap nav">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink end to="/" className={homeActive ? "active" : undefined}>
              Home
            </NavLink>
            <NavLink to="/vehicles">Browse vehicles</NavLink>
            <Link
              className={activeSection === "categories" ? "active" : undefined}
              aria-current={
                activeSection === "categories" ? "location" : undefined
              }
              to="/#categories"
            >
              Categories
            </Link>
            {user ? (
              <NavLink to={user.role === "ADMIN" ? "/admin" : "/bookings"}>
                {user.role === "ADMIN" ? "Admin dashboard" : "My bookings"}
              </NavLink>
            ) : (
              <Link
                className={
                  activeSection === "experience" ? "active" : undefined
                }
                aria-current={
                  activeSection === "experience" ? "location" : undefined
                }
                to="/#experience"
              >
                How it works
              </Link>
            )}
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <Link
                  className="icon-button"
                  to="/notifications"
                  aria-label={`Notifications${unread === null ? "" : `, ${unread} unread`}`}
                >
                  <Bell size={20} />
                  {!!unread && <span className="notification-dot" />}
                </Link>
                <details className="account-menu" ref={account}>
                  <summary>
                    <span className="account-avatar">
                      {user.fullName.slice(0, 1)}
                    </span>
                    <span className="account-name">
                      {user.fullName.split(" ")[0]}
                    </span>
                    <ChevronDown size={14} />
                  </summary>
                  <div className="account-popover">
                    <p>
                      <strong>{user.fullName}</strong>
                      <small>
                        {user.role === "ADMIN"
                          ? "Administrator"
                          : "Customer account"}
                      </small>
                    </p>
                    {links.map(({ to, label, Icon }) => (
                      <Link key={to} to={to}>
                        <Icon size={16} />
                        {label}
                      </Link>
                    ))}
                    <button onClick={logout}>
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link className="nav-signin" to="/login">
                  Sign in
                </Link>
                <Link className="btn small" to="/register">
                  Get started <ArrowUpRight size={15} />
                </Link>
              </>
            )}
            <button
              className="icon-button mobile-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            className="mobile-nav"
            id="mobile-nav"
            aria-label="Mobile navigation"
          >
            {publicLinks.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                end={to === "/"}
                to={to}
                onClick={() => setOpen(false)}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
            <Link
              className={activeSection === "categories" ? "active" : undefined}
              aria-current={
                activeSection === "categories" ? "location" : undefined
              }
              to="/#categories"
              onClick={() => setOpen(false)}
            >
              <Compass size={17} />
              Vehicle categories
            </Link>
            {user ? (
              <>
                {links.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    end={to === "/admin" || to === "/bookings"}
                    to={to}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={17} />
                    {label}
                  </NavLink>
                ))}
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                >
                  <LogOut size={17} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create an account</Link>
              </>
            )}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <Brand />
            <p>
              A better way to get there.
              <br />
              Find your drive. Make it a journey.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <Link to="/vehicles">Browse vehicles</Link>
            <Link to="/vehicles?type=CAR">Cars</Link>
            <Link to="/vehicles?type=MOTORCYCLE">Motorcycles</Link>
          </div>
          <div>
            <h3>{user?.role === "ADMIN" ? "Management" : "Your account"}</h3>
            {user ? (
              links.slice(0, 4).map((l) => (
                <Link key={l.to} to={l.to}>
                  {l.label}
                </Link>
              ))
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create an account</Link>
                <Link
                  to={user ? "/bookings/new" : "/login"}
                  state={user ? undefined : { from: "/bookings/new" }}
                >
                  Book a vehicle
                </Link>
              </>
            )}
          </div>
          <div className="footer-note">
            <Compass size={27} />
            <h3>Go somewhere good.</h3>
            <p>Your next journey starts with Traveler.</p>
            <Link className="text-link" to="/#availability">
              Check availability <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>
            © {new Date().getFullYear()} Traveler. All rights reserved.
          </span>
          <span>Made for the road ahead.</span>
        </div>
      </footer>
    </div>
  );
}
export function Workspace() {
  const { user } = useAuth();
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="workspace-label">
          <span className="eyebrow">TRAVELER WORKSPACE</span>
          <strong>
            {user?.role === "ADMIN" ? "Admin console" : "My Traveler"}
          </strong>
        </div>
        <nav aria-label="Workspace navigation">
          {(user?.role === "ADMIN" ? adminLinks : customerLinks).map(
            ({ to, label, Icon }) => (
              <NavLink
                end={to === "/admin" || to === "/bookings"}
                to={to}
                key={to}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ),
          )}
        </nav>
        <Link className="sidebar-explore" to="/">
          Back to homepage <ArrowUpRight size={16} />
        </Link>
        <div className="sidebar-user">
          <span className="account-avatar">{user?.fullName.slice(0, 1)}</span>
          <div>
            <strong>{user?.fullName}</strong>
            <small>
              {user?.role === "ADMIN" ? "Administrator" : "Customer"}
            </small>
          </div>
        </div>
      </aside>
      <section className="workspace-content">
        <Outlet />
      </section>
    </div>
  );
}
