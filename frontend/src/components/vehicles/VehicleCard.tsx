import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, CarFront, Bike, ImageOff, Users } from "lucide-react";
import type { Vehicle } from "../../types/api";
import { money } from "../../utils/format";
import { Badge } from "../common/UI";
import { vehicleMedia } from "../../assets/vehicleMedia";
import { useAuth } from "../../contexts/AuthContext";
import { query } from "../../api/client";
export function VehicleImage({ vehicle }: { vehicle: Vehicle }) {
  const [failed, setFailed] = useState(false);
  const asset =
    vehicleMedia.byId[vehicle.id] ||
    vehicleMedia.byModel[`${vehicle.brand} ${vehicle.model}`.toLowerCase()];
  return asset && !failed ? (
    <img
      loading="lazy"
      src={asset.src}
      alt={asset.alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={`vehicle-placeholder vehicle-placeholder-${vehicle.type.toLowerCase()}`}
    >
      <span className="vehicle-placeholder-art" aria-hidden="true">
        {vehicle.type === "CAR" ? (
          <CarFront size={104} strokeWidth={0.9} />
        ) : (
          <Bike size={104} strokeWidth={0.9} />
        )}
      </span>
      <span className="vehicle-placeholder-copy">
        <ImageOff size={14} aria-hidden="true" />
        Verified vehicle photo coming soon
      </span>
    </div>
  );
}
export function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const bookingUrl =
    "/bookings/new" +
    query({
      vehicleId: v.id,
      pickupDate: params.get("pickupDate") || undefined,
      returnDate: params.get("returnDate") || undefined,
    });
  return (
    <article className="vehicle-card">
      <Link className="vehicle-image" to={`/vehicles/${v.id}`}>
        <VehicleImage vehicle={v} />
        <span className="vehicle-type">
          {v.type === "CAR" ? "Car" : "Motorcycle"}
        </span>
      </Link>
      <div className="vehicle-card-head">
        <h3>
          <Link to={`/vehicles/${v.id}`}>
            {v.brand} {v.model}
          </Link>
        </h3>
        <Link
          className="circle-link"
          to={`/vehicles/${v.id}`}
          aria-label={`View ${v.brand} ${v.model}`}
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <p className="vehicle-spec">
        <Users size={14} />
        {v.passengerCapacity} seats <span>·</span>{" "}
        {v.type === "CAR" ? v.transmission : `${v.engineCapacityCc} cc`}
      </p>
      <div className="vehicle-card-bottom">
        <div>
          <strong>{money(v.dailyRate)}</strong>
          <small> / day</small>
        </div>
        <Badge value={v.status} />
      </div>
      <div className="vehicle-card-actions">
        <Link className="btn secondary small" to={`/vehicles/${v.id}`}>
          View details
        </Link>
        {user?.role === "ADMIN" ? (
          <Link className="btn small" to={`/admin/vehicles/${v.id}/edit`}>
            Manage vehicle
          </Link>
        ) : (
          v.status === "AVAILABLE" && (
            <Link className="btn small" to={bookingUrl}>
              Book now <ArrowUpRight size={15} />
            </Link>
          )
        )}
      </div>
    </article>
  );
}
