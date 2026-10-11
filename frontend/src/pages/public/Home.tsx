import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  CalendarDays,
  CarFront,
  Check,
  Compass,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { vehiclesApi } from "../../api/services";
import { query } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import {
  EmptyState,
  Field,
  ResourceView,
  Select,
} from "../../components/common/UI";
import { VehicleCard } from "../../components/vehicles/VehicleCard";
import { adminLinks, customerLinks } from "../../components/layout/navigation";
import { editorialHero } from "../../assets/vehicleMedia";
import { today } from "../../utils/format";
export default function Home() {
  const vehicles = useResource(() => vehiclesApi.list());
  const navigate = useNavigate();
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  return (
    <>
      <div className="wrap home-intro">
        <section className="hero">
          <div className="hero-photo">
            <img
              src={editorialHero}
              alt="Editorial photograph of a sports car on an open road"
              fetchPriority="high"
            />
          </div>
          <div className="hero-copy">
            <span className="hero-kicker">
              <MapPin size={14} /> YOUR JOURNEY STARTS HERE
            </span>
            <h1>
              Great journeys.
              <br />
              <span>Better drives.</span>
            </h1>
            <p>
              From everyday plans to open-road adventures.
              <br className="desktop-only" /> Find your next drive with
              Traveler.
            </p>
            <Link className="btn white" to="/vehicles">
              Explore vehicles <ArrowUpRight size={18} />
            </Link>
            <div className="hero-points">
              <span>
                <Check size={16} /> Clear daily rates
              </span>
              <span>
                <Check size={16} /> Easy reservations
              </span>
            </div>
          </div>
          <span className="photo-caption">
            THE OPEN ROAD IS CALLING{" "}
            <small>Editorial inspiration · Browse our live fleet below</small>
          </span>
        </section>
        <section className="search-wrap" id="availability">
          <div className="row-between">
            <h2>Find your next drive</h2>
            <span className="muted small-text">
              Your dates. Your kind of journey.
            </span>
          </div>
          <form
            className="hero-search"
            onInput={(e) =>
              (
                e.currentTarget.elements.namedItem(
                  "returnDate",
                ) as HTMLInputElement
              ).setCustomValidity("")
            }
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const from = String(f.get("pickupDate") || ""),
                to = String(f.get("returnDate") || "");
              if (!!from !== !!to || (from && to <= from)) {
                const input = e.currentTarget.elements.namedItem(
                  "returnDate",
                ) as HTMLInputElement;
                input.setCustomValidity(
                  "Choose both dates, with return after pickup.",
                );
                input.reportValidity();
                return;
              }
              navigate(
                "/vehicles" +
                  query({
                    type: String(f.get("type")),
                    pickupDate: from,
                    returnDate: to,
                  }),
              );
            }}
          >
            <Select name="type" label="Vehicle type">
              <option value="">All vehicles</option>
              <option value="CAR">Cars</option>
              <option value="MOTORCYCLE">Motorcycles</option>
            </Select>
            <Field
              name="pickupDate"
              type="date"
              label="Pick-up date"
              min={today()}
            />
            <Field
              name="returnDate"
              type="date"
              label="Return date"
              min={today()}
            />
            <button className="btn" type="submit">
              <Search size={18} /> Search vehicles
            </button>
          </form>
        </section>
      </div>
      {user && (
        <section className="wrap section home-hub" aria-labelledby="hub-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR TRAVELER</span>
              <h2 id="hub-title">
                Welcome back, {user.fullName.split(" ")[0]}.
              </h2>
              <p>
                {admin
                  ? "Everything you need to keep your rental service moving."
                  : "Your trips, your details, all right here."}
              </p>
            </div>
            <Link className="text-link" to={admin ? "/admin" : "/dashboard"}>
              Go to dashboard <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hub-grid">
            {(admin ? adminLinks : customerLinks)
              .filter((link) => !["/admin", "/dashboard"].includes(link.to))
              .map(({ to, label, description, Icon }) => (
                <Link className="hub-card" to={to} key={to}>
                  <span className="feature-icon">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3>{label}</h3>
                    <p>{description}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
          </div>
        </section>
      )}
      <div className="wrap benefits-strip">
        <div>
          <CarFront />
          <span>
            <strong>A ride that fits</strong>
            <small>Cars and motorcycles for your plans</small>
          </span>
        </div>
        <div>
          <CalendarDays />
          <span>
            <strong>Plan with confidence</strong>
            <small>Check availability for your dates</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Clarity at every step</strong>
            <small>Daily rates and rental totals in LKR</small>
          </span>
        </div>
      </div>
      <section className="wrap section" id="collection">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORE THE FLEET</span>
            <h2>A drive for every plan.</h2>
            <p>Make the everyday easier. Make the weekend yours.</p>
          </div>
          <Link className="btn secondary" to="/vehicles">
            View all vehicles <ArrowRight size={16} />
          </Link>
        </div>
        <ResourceView resource={vehicles}>
          {(data) => {
            const fleet = data.filter((v) => v.status !== "INACTIVE");
            return fleet.length ? (
              <div className="vehicle-grid">
                {fleet.slice(0, 3).map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="New journeys are on the way."
                description="Our live fleet is currently empty. Available vehicles will appear here as they are added."
                to={admin ? "/admin/vehicles/new" : "/vehicles"}
                action={admin ? "Add your first vehicle" : "Browse vehicles"}
              />
            );
          }}
        </ResourceView>
      </section>
      <section className="wrap section categories-section" id="categories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CHOOSE YOUR PACE</span>
            <h2>Two ways to get away.</h2>
          </div>
          <p>Different wheels. The same sense of possibility.</p>
        </div>
        <div className="category-links">
          <Link to="/vehicles?type=CAR">
            <span className="category-art">
              <CarFront size={92} strokeWidth={1.2} />
            </span>
            <div>
              <span className="eyebrow">COMFORT FOR EVERY MILE</span>
              <h3>Cars</h3>
              <p>More room for your people and your plans.</p>
              <span className="text-link">
                Explore cars <ArrowUpRight size={17} />
              </span>
            </div>
          </Link>
          <Link to="/vehicles?type=MOTORCYCLE">
            <span className="category-art">
              <Bike size={92} strokeWidth={1.2} />
            </span>
            <div>
              <span className="eyebrow">TAKE THE SCENIC ROUTE</span>
              <h3>Motorcycles</h3>
              <p>A little closer to the world around you.</p>
              <span className="text-link">
                Explore motorcycles <ArrowUpRight size={17} />
              </span>
            </div>
          </Link>
        </div>
      </section>
      <section className="experience section" id="experience">
        <div className="wrap">
          <div className="section-heading centered">
            <div>
              <span className="eyebrow">LESS PLANNING, MORE GOING</span>
              <h2>Your next trip in three steps.</h2>
              <p>
                Everything you need, from the first search to the last mile.
              </p>
            </div>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Find your fit",
                "Browse the live fleet, compare daily rates and choose a car or motorcycle for your journey.",
                Search,
              ],
              [
                "02",
                "Make a reservation",
                "Pick your dates, check availability and confirm your booking with a clear rental total.",
                CalendarDays,
              ],
              [
                "03",
                "Keep it all together",
                "Manage bookings, payment records and rental updates from your personal dashboard.",
                Compass,
              ],
            ].map(([number, title, description, Icon]) => {
              const StepIcon = Icon as typeof Compass;
              return (
                <article key={String(number)}>
                  <span className="step-number">{String(number)}</span>
                  <span className="feature-icon">
                    <StepIcon size={25} />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(description)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="wrap closing">
        <div>
          <span className="eyebrow">MAKE ROOM FOR SOMETHING NEW</span>
          <h2>
            Your next adventure
            <br />
            starts with a drive.
          </h2>
          <p>Choose your wheels. We’ll help you get the details together.</p>
          <Link className="btn white" to="/vehicles">
            Find my drive <ArrowUpRight size={18} />
          </Link>
        </div>
        <Compass
          className="closing-compass"
          size={210}
          strokeWidth={0.7}
          aria-hidden="true"
        />
      </section>
    </>
  );
}
