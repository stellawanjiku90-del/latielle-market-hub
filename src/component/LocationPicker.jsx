import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2, ChevronDown } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { KENYA_COUNTIES, getCountyData, getTownsForSubCounty, getAllTownsForCounty } from "../utils/kenyaLocations";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const KENYA_CENTER = [-0.0236, 37.9062];
const KENYA_ZOOM = 6;

function DraggableMarker({ position, onChange }) {
  const markerRef = useRef(null);
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  if (!position) return null;
  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const pos = m.getLatLng();
            onChange({ lat: pos.lat, lng: pos.lng });
          }
        },
      }}
    />
  );
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom || 13, { duration: 1.2 });
  }, [target, map]);
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const [county, setCounty] = useState(value?.county || "");
  const [subCounty, setSubCounty] = useState(value?.subCounty || "");
  const [town, setTown] = useState(value?.town || "");
  const [specificArea, setSpecificArea] = useState(value?.specificArea || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);
  const debounceRef = useRef(null);

  const countyData = getCountyData(county);
  const availableTowns = subCounty ? getTownsForSubCounty(county, subCounty) : getAllTownsForCounty(county);

  // When county changes, reset sub-county and town, fly to county center
  const handleCountyChange = (val) => {
    setCounty(val);
    setSubCounty("");
    setTown("");
    setSpecificArea("");
    const cd = getCountyData(val);
    if (cd) {
      setFlyTarget({ lat: cd.center.lat, lng: cd.center.lng, zoom: cd.zoom });
      emitChange({ county: val, subCounty: "", town: "", specificArea: "", lat: cd.center.lat, lng: cd.center.lng, address: `${val} County, Kenya` });
    }
  };

  const handleSubCountyChange = (val) => {
    setSubCounty(val);
    emitChange({ county, subCounty: val, town, specificArea });
  };

  const handleTownChange = (val) => {
    setTown(val);
    // Search the town on the map
    if (val && county) {
      searchAndFlyToTown(`${val}, ${county}, Kenya`);
    }
    emitChange({ county, subCounty, town: val, specificArea });
  };

  const searchAndFlyToTown = async (query) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data[0]) {
      const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), zoom: 14 };
      setFlyTarget(pos);
    }
  };

  const emitChange = (fields) => {
    const lat = fields.lat ?? value?.lat;
    const lng = fields.lng ?? value?.lng;
    const parts = [fields.specificArea || specificArea, fields.town || town, fields.subCounty || subCounty, `${fields.county || county} County`, "Kenya"].filter(Boolean);
    const address = parts.join(", ");
    onChange({ lat, lng, address, county: fields.county ?? county, subCounty: fields.subCounty ?? subCounty, town: fields.town ?? town, specificArea: fields.specificArea ?? specificArea });
  };

  // Free-text search (Nominatim)
  const searchLocation = async (q) => {
    if (!q || q.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + (county ? `, ${county}, Kenya` : ", Kenya"))}&format=json&limit=6&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    setSuggestions(data);
    setSearching(false);
  };

  const handleSearchInput = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(q), 400);
  };

  const selectSuggestion = (place) => {
    const pos = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
    const addr = place.display_name;
    const specific = place.display_name.split(",")[0];
    setSpecificArea(specific);
    setFlyTarget({ ...pos, zoom: 16 });
    setSearchQuery(specific);
    setSuggestions([]);
    onChange({ ...pos, address: addr, county, subCounty, town, specificArea: specific });
  };

  const handleMarkerChange = async (pos) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data.display_name || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    onChange({ ...pos, address: addr, county, subCounty, town, specificArea });
  };

  const handleSpecificAreaChange = (e) => {
    setSpecificArea(e.target.value);
    emitChange({ specificArea: e.target.value });
  };

  // Build a readable summary
  const locationSummary = [specificArea, town, subCounty, county ? `${county} County` : ""].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      {/* Step 1: County */}
      <div>
        <Label className="text-xs font-semibold text-foreground mb-1.5 block">County *</Label>
        <Select value={county} onValueChange={handleCountyChange}>
          <SelectTrigger className="font-body text-sm">
            <SelectValue placeholder="Select county..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {KENYA_COUNTIES.map(c => (
              <SelectItem key={c.name} value={c.name} className="font-body text-sm">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Sub-County */}
      {countyData && (
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1.5 block">Sub-County</Label>
          <Select value={subCounty} onValueChange={handleSubCountyChange}>
            <SelectTrigger className="font-body text-sm">
              <SelectValue placeholder="Select sub-county..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {countyData.subCounties.map(sc => (
                <SelectItem key={sc.name} value={sc.name} className="font-body text-sm">{sc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 3: Town / Area — filtered by sub-county if selected */}
      {county && (
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1.5 block">Town / Area</Label>
          <Select value={town} onValueChange={handleTownChange}>
            <SelectTrigger className="font-body text-sm">
              <SelectValue placeholder={subCounty ? `Towns in ${subCounty}...` : "Select town or area..."} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {availableTowns.map(t => (
                <SelectItem key={t} value={t} className="font-body text-sm">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 4: Specific Street / Building / Estate */}
      {county && (
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1.5 block">
            Specific Location <span className="text-muted-foreground font-normal">(street, building, estate, landmark)</span>
          </Label>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`e.g. Kenyatta Avenue, Garden Estate, Tom Mboya St...`}
                  value={searchQuery || specificArea}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSpecificAreaChange(e);
                    clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => searchLocation(e.target.value), 400);
                  }}
                  className="pl-10 font-body text-sm"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-lg mt-1 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.place_id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm font-body hover:bg-secondary/60 border-b border-border/40 last:border-0 flex items-start gap-2"
                    onClick={() => selectSuggestion(s)}
                  >
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="line-clamp-2 text-foreground">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Search above or click on the map to pin your exact location
          </p>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 320 }}>
        <MapContainer
          center={value?.lat ? [value.lat, value.lng] : KENYA_CENTER}
          zoom={value?.lat ? 14 : KENYA_ZOOM}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <DraggableMarker position={value?.lat ? { lat: value.lat, lng: value.lng } : null} onChange={handleMarkerChange} />
          {flyTarget && <FlyTo target={flyTarget} />}
        </MapContainer>
      </div>

      {/* Selected location summary */}
      {locationSummary ? (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary font-body mb-0.5">Selected Location</p>
            <p className="text-xs font-body text-foreground leading-relaxed">{locationSummary}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground font-body text-center">
          Start by selecting a county above, then narrow down to your exact location
        </p>
      )}
    </div>
  );
}