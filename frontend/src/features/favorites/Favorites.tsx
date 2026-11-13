import { Link } from "react-router-dom";
import { Heading, Empty, ErrorBox, FavoriteButton, QueryState, VehiclePhoto, Badge } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { categoryFor, money } from "../../utils/domain";
import type { Favorite, Vehicle } from "../../types";

export function MyFavorites() {
  const favorites = useApi<Favorite[]>("/favorites", true);
  const vehicles = useApi<Vehicle[]>("/vehicles");
  const byId = new Map(vehicles.data?.map((vehicle) => [vehicle.id, vehicle]));
  return (
    <>
      <Heading eyebrow="Saved for your next journey" title="My Favourites">
        Keep promising vehicles here while you plan. Availability is always confirmed when you choose dates.
      </Heading>
      <QueryState query={favorites}>
        {!favorites.data?.length ? (
          <Empty title="No saved vehicles yet">
            Explore the catalogue and use the heart to save a vehicle for later.
          </Empty>
        ) : vehicles.isPending ? (
          <div className="loading" role="status">Loading saved vehicle details…</div>
        ) : (
          <>
            <ErrorBox error={vehicles.error} />
            <div className="grid two">
              {favorites.data.map((favorite) => {
                const vehicle = byId.get(favorite.vehicleId);
                return vehicle ? (
                  <article className="vehicle-card" key={favorite.id}>
                    <Link to={`/vehicles/${vehicle.id}`} aria-label={`View ${vehicle.brand} ${vehicle.model}`}><VehiclePhoto vehicle={vehicle} /></Link>
                    <div className="vehicle-card-body">
                      <div className="row"><span className="eyebrow">{categoryFor(vehicle.type).singular}</span><Badge value={vehicle.status} /></div>
                      <h3>{vehicle.brand} {vehicle.model}</h3>
                      <div className="card-bottom"><div><strong>{money(vehicle.dailyRate)}</strong><small> / day</small></div><FavoriteButton vehicle={vehicle} /></div>
                    </div>
                  </article>
                ) : (
                  <article className="panel" key={favorite.id}>
                    <h3>Saved vehicle unavailable</h3>
                    <p>This vehicle is currently unavailable or no longer listed. You can still remove it from your Favourites.</p>
                    <Badge value={favorite.vehicleStatus} />
                    <div className="actions"><FavoriteButton vehicle={{ id: favorite.vehicleId, brand: "this", model: "vehicle" }} /></div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
