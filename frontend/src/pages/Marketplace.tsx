import { useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Compass,
  CalendarDays,
  Star,
  CheckCircle2,
} from "lucide-react";
import {
  Heading,
  Icon,
  VehicleCard,
  QueryState,
  Empty,
  VehiclePhoto,
  ErrorBox,
  Badge,
  FavoriteButton,
} from "../components/ui";
import { SearchForm } from "../components/SearchForm";
import { useApi, useAction, useSession } from "../hooks/useApi";
import {
  categories,
  categoryFor,
  dateError,
  today,
  days,
  money,
  specifications,
} from "../utils/domain";
import type { Vehicle, VehicleType, Review, Booking } from "../types";
import { api, params, ApiError } from "../services/api";
export function Reviews({ vehicleId }: { vehicleId?: string }) {
  const q = useApi<Review[]>(
    "/reviews" + (vehicleId ? "?vehicleId=" + vehicleId : ""),
  );
  return (
    <QueryState query={q}>
      {q.data?.length ? (
        <div className="grid three">
          {q.data.slice(0, 6).map((r) => (
            <article className="review-card" key={r.id}>
              <div aria-label={`${r.rating} out of 5 stars`} className="stars">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </div>
              <p>“{r.comment}”</p>
              <small>
                <CheckCircle2 size={14} /> Completed rental review
              </small>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="The next story could be yours">
          Reviews from completed DriveLink rentals will appear here.
        </Empty>
      )}
    </QueryState>
  );
}
export function Home() {
  const vehicles = useApi<Vehicle[]>("/vehicles");
  return (
    <>
      <section id="home" className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> A better way to get there
            </div>
            <h1>
              Your Journey.
              <br />
              Your Vehicle.
              <br />
              <span>Your Freedom.</span>
            </h1>
            <p>
              Find the right vehicle for every journey. Explore cars,
              motorcycles, three-wheelers, and vans with DriveLink.
            </p>
            <div className="actions">
              <Link className="button" to="/vehicles">
                Explore vehicles <ArrowUpRight size={19} />
              </Link>
              <Link className="button secondary" to="/#how-it-works">
                How it works <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-note">
              <span>
                <ShieldCheck size={17} /> Clear rental details
              </span>
              <span>
                <Compass size={17} /> Four ways to explore
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Decorative DriveLink road illustration"
          >
            <div className="art-top">
              <span>DRIVELINK / OPEN ROADS</span>
              <ArrowUpRight />
            </div>
            <div className="road road-one" />
            <div className="road road-two" />
            <div className="hero-logo">
              <img
                src="/drivelink-logo.png"
                alt="Official DriveLink car and chain mark"
              />
            </div>
            <div className="art-bottom">
              <span>
                THE ROAD IS YOURS.
                <br />
                <strong>Where will you go next?</strong>
              </span>
              <span className="art-circle">
                <Compass size={28} />
              </span>
            </div>
          </div>
        </div>
        <div className="container search-wrap">
          <SearchForm />
          <div className="search-caption">
            Your dates. Your choice. Find a vehicle that fits.
          </div>
        </div>
      </section>
      <section id="categories" className="section container">
        <Heading
          eyebrow="A ride for every kind of day"
          title="Find your kind of freedom."
          action={
            <Link className="text-link" to="/vehicles">
              All vehicles <ArrowRight size={17} />
            </Link>
          }
        >
          From city errands to a change of scenery.
        </Heading>
        <div className="grid four category-grid">
          {Object.entries(categories).map(([type, c], i) => (
            <Link
              to={"/vehicles?type=" + type}
              className={"category-card category-" + i}
              key={type}
            >
              <span className="category-number">0{i + 1}</span>
              <div className="category-icon">
                <Icon type={type as VehicleType} size={90} />
              </div>
              <h3>{c.label}</h3>
              <p>{c.description}</p>
              <span className="category-arrow">
                <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section soft">
        <div className="container">
          <Heading
            eyebrow="Explore the collection"
            title="Your next ride is waiting."
            action={
              <Link className="text-link" to="/vehicles">
                Explore the catalogue <ArrowRight size={17} />
              </Link>
            }
          >
            Current vehicles, straight from our catalogue.
          </Heading>
          <QueryState query={vehicles}>
            {vehicles.data?.length ? (
              <div className="grid three">
                {vehicles.data.slice(0, 3).map((v) => (
                  <VehicleCard vehicle={v} key={v.id} />
                ))}
              </div>
            ) : (
              <Empty title="New journeys on the horizon">
                There are no vehicles listed right now. Please check back soon.
              </Empty>
            )}
          </QueryState>
        </div>
      </section>
      <section className="section container">
        <div className="why-grid">
          <div>
            <div className="eyebrow">Less friction. More freedom.</div>
            <h2>
              A simpler way
              <br />
              to find your ride.
            </h2>
            <p>Everything you need to plan your rental, in one place.</p>
            <Link className="text-link" to="/vehicles">
              Start exploring <ArrowRight size={17} />
            </Link>
          </div>
          {[
            [
              Compass,
              "A vehicle for your plans",
              "Compare four categories and choose the space that suits your journey.",
            ],
            [
              CalendarDays,
              "Plan with clarity",
              "Check your dates and see the rental total before payment.",
            ],
            [
              ShieldCheck,
              "Stay in the loop",
              "Follow your booking, payment and rental updates in your account.",
            ],
          ].map(([C, t, d]) => {
            const I = C as typeof Compass;
            return (
              <div className="benefit" key={String(t)}>
                <I size={28} />
                <h3>{String(t)}</h3>
                <p>{String(d)}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section id="how-it-works" className="section how-section">
        <div className="container">
          <Heading
            eyebrow="From browsing to going"
            title="A few steps. A whole new journey."
          >
            Keep the planning simple.
          </Heading>
          <div className="grid three">
            {[
              [
                "01",
                "Find your vehicle",
                "Explore the catalogue, compare your options and check availability for your dates.",
              ],
              [
                "02",
                "Make it yours",
                "Sign in, confirm your booking and choose cash on pickup or a demo card payment.",
              ],
              [
                "03",
                "Follow your rental",
                "Your dashboard keeps your booking details, payment status and updates together.",
              ],
            ].map(([n, t, d]) => (
              <div className="step" key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="reviews" className="section container">
        <Heading
          eyebrow="The journeys behind the reviews"
          title="Real rentals. Real experiences."
        />
        <Reviews />
      </section>
      <section className="section soft">
        <div className="container faq-grid">
          <div>
            <div className="eyebrow">Before you hit the road</div>
            <h2>
              A little clarity
              <br />
              goes a long way.
            </h2>
            <p>Your rental questions, answered.</p>
          </div>
          <div>
            {[
              [
                "How is the rental price calculated?",
                "The daily rate is multiplied by the number of rental days. The pickup day is included; the return day is excluded. Your confirmed booking shows the final server-calculated total.",
              ],
              [
                "Can I book the same vehicle again?",
                "Yes. Open a previous booking and choose Book Again. You will select new dates and check the current vehicle rate and availability.",
              ],
              [
                "Are card payments real?",
                "No. DriveLink is a university project. Demo Card Payment and any refunds are simulations. You will never be asked for card details.",
              ],
              [
                "Can I cancel my booking?",
                "Confirmed bookings can be cancelled before the pickup day in Asia/Colombo. Your booking page shows eligible actions and the actual cancellation and payment status.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="container journey-banner">
        <div>
          <span className="eyebrow">A new day. A new destination.</span>
          <h2>
            Wherever life takes you,
            <br />
            find your way with DriveLink.
          </h2>
        </div>
        <Link className="button white" to="/vehicles">
          Find your vehicle <ArrowUpRight size={20} />
        </Link>
      </section>
    </>
  );
}
export function Catalogue() {
  const [search, setSearch] = useSearchParams();
  const allowed = [
    "q",
    "type",
    "minimumPassengers",
    "pickupDate",
    "returnDate",
    "sort",
  ];
  const query = params(
    Object.fromEntries([...search].filter(([key]) => allowed.includes(key))),
  );
  const error =
    search.get("pickupDate") || search.get("returnDate")
      ? dateError(
          search.get("pickupDate") || "",
          search.get("returnDate") || "",
        )
      : "";
  const vehicles = useApi<Vehicle[]>("/vehicles?" + query, false, !error);
  return (
    <div className="container section">
      <Heading
        eyebrow="The DriveLink collection"
        title="A ride that fits your journey."
      >
        Choose your dates. Explore your options.
      </Heading>
      <div className="catalogue-layout">
        <aside className="panel">
          <div className="row">
            <h3>Find your vehicle</h3>
            <button className="text-button" onClick={() => setSearch({})}>
              Clear all
            </button>
          </div>
          <SearchForm key={search.toString()} initial={search} catalogue />
        </aside>
        <div>
          <ErrorBox error={error} />
          {!error && (
            <QueryState query={vehicles}>
              <div className="result-summary">
                <strong>{vehicles.data?.length || 0} vehicles</strong>
                <span>
                  {search.get("pickupDate")
                    ? "Available for your selected dates"
                    : "Select dates to confirm availability"}
                </span>
              </div>
              {vehicles.data?.length ? (
                <div className="grid two">
                  {vehicles.data.map((v) => (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      query={query}
                      available={!!search.get("pickupDate")}
                    />
                  ))}
                </div>
              ) : (
                <Empty title="No vehicles match this journey">
                  Try different dates or clear a filter to see more options.
                </Empty>
              )}
            </QueryState>
          )}
        </div>
      </div>
    </div>
  );
}
export function VehicleDetails() {
  const { id } = useParams(),
    [search] = useSearchParams(),
    session = useSession(),
    navigate = useNavigate();
  const q = useApi<Vehicle>("/vehicles/" + id);
  const [pickup, setPickup] = useState(search.get("pickupDate") || ""),
    [end, setEnd] = useState(search.get("returnDate") || ""),
    [error, setError] = useState(""),
    [checked, setChecked] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const action = useAction<Booking>();
  const bookingRequestInFlight = useRef(false);
  const key = id + "|" + pickup + "|" + end;
  async function check() {
    const e = dateError(pickup, end);
    setError(e);
    if (e) return;
    setBusy(true);
    try {
      const available = await api<Vehicle[]>(
        "/vehicles?" + params({ pickupDate: pickup, returnDate: end }),
      );
      setChecked(available.some((v) => v.id === id) ? key : "");
      if (!available.some((v) => v.id === id))
        setError(
          "This vehicle is not available for those dates. Try other dates or browse the catalogue.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function book() {
    if (bookingRequestInFlight.current || action.isPending || uncertain) return;
    if (!session) {
      navigate(
        "/signin?returnTo=" +
          encodeURIComponent(
            "/vehicles/" +
              id +
              "?" +
              params({ pickupDate: pickup, returnDate: end }),
          ),
      );
      return;
    }
    if (session.user.role !== "CUSTOMER") {
      setError("Booking is available to customer accounts.");
      return;
    }
    const dateValidationError = dateError(pickup, end);
    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }
    if (checked !== key) {
      setError("Check availability for these dates before confirming your booking.");
      return;
    }
    bookingRequestInFlight.current = true;
    try {
      const b = await action.mutateAsync({
        path: "/bookings",
        method: "POST",
        body: { vehicleId: id, pickupDate: pickup, returnDate: end },
      });
      navigate("/account/bookings/" + b.id + "/payment");
    } catch (e) {
      if (e instanceof ApiError && e.uncertain) {
        setUncertain(true);
        setError(
          "The booking result is uncertain. Open My Bookings and check for a matching reservation before making another booking.",
        );
      } else setError((e as Error).message);
    } finally {
      bookingRequestInFlight.current = false;
    }
  }
  return (
    <div className="container section">
      <Link className="text-link" to="/vehicles">
        ← Back to vehicles
      </Link>
      <QueryState query={q}>
        {q.data && (
          <>
            <div className="detail-layout">
              <div>
                <VehiclePhoto vehicle={q.data} large />
                <div className="panel details-copy">
                  <span className="eyebrow">
                    {categoryFor(q.data.type).singular}
                  </span>
                  <h1>
                    {q.data.brand} {q.data.model}
                  </h1>
                  <div className="specs">
                    {specifications(q.data).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <p>
                    {q.data.description ||
                      "Explore the specifications and choose your rental dates."}
                  </p>
                  <h3>Good to know</h3>
                  <p>{q.data.rentalGuidance}</p>
                  <Badge value={q.data.status} />
                  <p className="muted">
                    Vehicle status does not guarantee availability for every
                    date.
                  </p>
                </div>
              </div>
              <aside className="panel booking-panel">
                <span className="eyebrow">Make this journey yours</span>
                <h2>
                  {money(q.data.dailyRate)}
                  <small> / day</small>
                </h2>
                <FavoriteButton vehicle={q.data} />
                {search.has("again") && (
                  <div className="notice">
                    Book Again uses the current rate and creates a new booking.
                    Your original rental stays unchanged.
                  </div>
                )}
                <label>
                  Pickup date
                  <input
                    type="date"
                    min={today()}
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                  />
                </label>
                <label>
                  Return date
                  <input
                    type="date"
                    min={today()}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                {!dateError(pickup, end) && (
                  <div className="estimate">
                    <div className="row">
                      <span>{days(pickup, end)} rental days</span>
                      <strong>
                        {money(
                          (Math.round(q.data.dailyRate * 100) *
                            days(pickup, end)) /
                            100,
                        )}
                      </strong>
                    </div>
                    <small>
                      Estimate only. Your confirmed booking total is final.
                    </small>
                  </div>
                )}
                <ErrorBox error={error} />
                {checked === key && (
                  <div className="notice success">
                    Available for your selected dates.
                  </div>
                )}
                <button
                  className="button full"
                  onClick={check}
                  disabled={busy || action.isPending}
                >
                  {busy ? "Checking…" : "Check availability"}
                </button>
                <button
                  className="button full secondary"
                  onClick={book}
                  disabled={checked !== key || action.isPending || uncertain}
                >
                  {action.isPending
                    ? "Creating booking…"
                    : session
                      ? "Confirm booking"
                      : "Sign in to book"}
                </button>
                {uncertain && (
                  <Link to="/account/bookings">Check My Bookings</Link>
                )}
                <p className="muted">
                  Dates use Sri Lanka time. Return day is excluded. No real
                  online payment is taken.
                </p>
              </aside>
            </div>
            <Heading title="Reviews from this vehicle’s journeys" />
            <Reviews vehicleId={id} />
          </>
        )}
      </QueryState>
    </div>
  );
}
