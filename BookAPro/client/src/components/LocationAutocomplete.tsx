import { useState } from "react";

export default function LocationAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange({ location: newQuery, latitude: undefined, longitude: undefined });
    if (newQuery.length > 2) {
      setIsSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newQuery)}`
      );
      setResults(await res.json());
      setIsSearching(false);
    } else {
      setResults([]);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Type a city or address"
        className="w-full"
      />
      {isSearching && <p className="text-xs text-muted-foreground">Searching...</p>}
      <ul className="bg-muted rounded shadow mt-1">
        {results.map((place) => (
          <li
            key={place.place_id}
            className="cursor-pointer hover:bg-primary/10 px-2 py-1"
            onClick={() => {
              setQuery(place.display_name);
              setResults([]);
              onChange({
                location: place.display_name,
                latitude: parseFloat(place.lat),
                longitude: parseFloat(place.lon),
              });
            }}
          >
            {place.display_name}
          </li>
        ))}
      </ul>
    </div>
  );
}