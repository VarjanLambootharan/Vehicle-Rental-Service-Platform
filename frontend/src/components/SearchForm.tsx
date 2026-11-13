import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { categories, dateError, today } from "../utils/domain";
import { params } from "../services/api";
import { ErrorBox } from "./ui";
export function SearchForm({
  initial = new URLSearchParams(),
  catalogue = false,
}: {
  initial?: URLSearchParams;
  catalogue?: boolean;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  return (
    <form
      className={"search-form " + (catalogue ? "filter-form" : "")}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const values = Object.fromEntries(f) as Record<string, string>;
        const err =
          values.pickupDate || values.returnDate
            ? dateError(values.pickupDate, values.returnDate)
            : "";
        setError(err);
        if (!err) navigate("/vehicles?" + params(values));
      }}
    >
      {catalogue && (
        <label>
          Search vehicles
          <input
            name="q"
            placeholder="Brand, model or registration"
            defaultValue={initial.get("q") || ""}
          />
        </label>
      )}
      <label>
        Pickup date
        <input
          type="date"
          name="pickupDate"
          min={today()}
          defaultValue={initial.get("pickupDate") || ""}
        />
      </label>
      <label>
        Return date
        <input
          type="date"
          name="returnDate"
          min={today()}
          defaultValue={initial.get("returnDate") || ""}
        />
      </label>
      <label>
        Vehicle category
        <select name="type" defaultValue={initial.get("type") || ""}>
          <option value="">All vehicles</option>
          {Object.entries(categories).map(([key, c]) => (
            <option value={key} key={key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Minimum passengers
        <input
          type="number"
          name="minimumPassengers"
          min="0"
          max="18"
          placeholder="Any"
          defaultValue={initial.get("minimumPassengers") || ""}
        />
      </label>
      {catalogue && (
        <label>
          Sort by
          <select name="sort" defaultValue={initial.get("sort") || ""}>
            <option value="">Recommended</option>
            <option value="PRICE_ASC">Price: low to high</option>
            <option value="PRICE_DESC">Price: high to low</option>
          </select>
        </label>
      )}
      <button className="button" type="submit">
        <Search size={18} />
        {catalogue ? "Apply filters" : "Search vehicles"}
      </button>
      {error && <ErrorBox error={error} />}
    </form>
  );
}
