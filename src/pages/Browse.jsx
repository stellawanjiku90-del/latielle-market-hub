import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, LocateFixed } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ListingCard from "../components/ListingCard";
import PullToRefreshWrapper from "../components/PullToRefreshWrapper";

const CATEGORIES = ["All", "Salon", "Barbershop", "Restaurant", "School", "Cyber Café", "Hardware Shop", "Supermarket", "Car Wash", "Hotel", "Pharmacy", "Boutique", "Electronics Shop", "Gym", "Café", "Online Business", "Franchise", "Other"];
const COUNTIES = ["All", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Kajiado", "Uasin Gishu", "Kilifi", "Nyeri", "Meru", "Kwale", "Laikipia", "Nyandarua", "Murang'a", "Trans Nzoia", "Kakamega", "Bungoma", "Narok"];

const PRICE_RANGES = [
  { label: "Any Price", min: 0, max: Infinity },
  { label: "Under KES 500K", min: 0, max: 500000 },
  { label: "KES 500K - 1M", min: 500000, max: 1000000 },
  { label: "KES 1M - 5M", min: 1000000, max: 5000000 },
  { label: "KES 5M - 10M", min: 5000000, max: 10000000 },
  { label: "Over KES 10M", min: 10000000, max: Infinity },
];

const RADIUS_OPTIONS = [
  { label: "Any Distance", km: null },
  { label: "Within 10 km", km: 10 },
  { label: "Within 25 km", km: 25 },
  { label: "Within 50 km", km: 50 },
  { label: "Within 100 km", km: 100 },
];

// Approximate county centroids (Kenya)
const COUNTY_CENTROIDS = {
  Nairobi: [-1.2921, 36.8219], Mombasa: [-4.0435, 39.6682], Kisumu: [-0.0917, 34.7680],
  Nakuru: [-0.3031, 36.0800], Kiambu: [-1.0311, 36.8681], Machakos: [-1.5177, 37.2634],
  Kajiado: [-1.8520, 36.7820], "Uasin Gishu": [0.5143, 35.2698], Kilifi: [-3.6309, 39.8499],
  Nyeri: [-0.4167, 36.9500], Meru: [0.0467, 37.6490], Kwale: [-4.1740, 39.4526],
  Laikipia: [0.3600, 36.7830], Nyandarua: [-0.1811, 36.5042], "Murang'a": [-0.7180, 37.1530],
  "Trans Nzoia": [1.0560, 34.9820], Kakamega: [0.2827, 34.7519], Bungoma: [0.5635, 34.5594],
  Narok: [-1.0790, 35.8710],
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FilterControls({ category, setCategory, county, setCounty, priceRange, setPriceRange, radius, setRadius, userLocation, onLocate, locating }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground font-body mb-1.5 block">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-body">{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground font-body mb-1.5 block">County</label>
        <Select value={county} onValueChange={setCounty}>
          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
          <SelectContent>{COUNTIES.map(c => <SelectItem key={c} value={c} className="font-body">{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground font-body mb-1.5 block">Price Range</label>
        <Select value={String(priceRange)} onValueChange={(v) => setPriceRange(Number(v))}>
          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
          <SelectContent>{PRICE_RANGES.map((p, i) => <SelectItem key={i} value={String(i)} className="font-body">{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground font-body mb-1.5 block">Location Radius</label>
        <Select value={String(radius)} onValueChange={(v) => setRadius(Number(v))}>
          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
          <SelectContent>{RADIUS_OPTIONS.map((r, i) => <SelectItem key={i} value={String(i)} className="font-body">{r.label}</SelectItem>)}</SelectContent>
        </Select>
        {radius > 0 && (
          <button
            type="button"
            onClick={onLocate}
            className={`mt-2 w-full text-xs font-body flex items-center justify-center gap-1.5 py-1.5 rounded-md border transition-colors ${
              userLocation ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {locating ? "Detecting..." : userLocation ? "Location detected ✓" : "Use my location"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Browse() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [county, setCounty] = useState("All");
  const [priceRange, setPriceRange] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radius, setRadius] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const filter = { status: "approved" };
    if (category !== "All") filter.category = category;
    if (county !== "All") filter.county = county;
    api.entities.BusinessListing.filter(filter, "-created_date", 50)
      .then((data) => {
        let filtered = data;
        const range = PRICE_RANGES[priceRange];
        if (range.max !== Infinity || range.min !== 0)
          filtered = filtered.filter(l => l.asking_price >= range.min && l.asking_price <= range.max);
        if (query) {
          const q = query.toLowerCase();
          filtered = filtered.filter(l =>
            (l.title || "").toLowerCase().includes(q) ||
            (l.category || "").toLowerCase().includes(q) ||
            (l.description || "").toLowerCase().includes(q) ||
            (l.county || "").toLowerCase().includes(q)
          );
        }
        setListings(filtered);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [category, county, priceRange, query]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings, radius, userLocation]);

  const handleLocate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); alert("Could not detect location. Please enable location access."); }
    );
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 9;

  const clearAll = () => { setCategory("All"); setCounty("All"); setPriceRange(0); setRadius(0); setUserLocation(null); setQuery(""); setCurrentPage(1); };
  const activeFilters = (category !== "All" ? 1 : 0) + (county !== "All" ? 1 : 0) + (priceRange !== 0 ? 1 : 0) + (radius !== 0 ? 1 : 0);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [category, county, priceRange, query, radius, userLocation]);

  const totalPages = Math.max(1, Math.ceil(listings.length / PER_PAGE));
  const paginated = listings.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <PullToRefreshWrapper onRefresh={fetchListings} className="pt-20 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Browse Businesses</h1>
          <p className="text-muted-foreground font-body mt-1">Established businesses available for sale across Kenya</p>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search businesses..." value={query} onChange={e => setQuery(e.target.value)} className="pl-10 font-body" />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 font-body lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />Filters{activeFilters > 0 && ` (${activeFilters})`}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 font-body">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-6">
                <FilterControls {...{ category, setCategory, county, setCounty, priceRange, setPriceRange, radius, setRadius, userLocation, onLocate: handleLocate, locating }} />
                <Button className="w-full mt-6" onClick={() => setFiltersOpen(false)}>Apply Filters</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 bg-card border border-border/50 rounded-xl p-5">
              <h3 className="font-heading text-sm font-semibold mb-4">Filters</h3>
              <FilterControls {...{ category, setCategory, county, setCounty, priceRange, setPriceRange, radius, setRadius, userLocation, onLocate: handleLocate, locating }} />
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" className="mt-4 w-full text-xs font-body" onClick={clearAll}>
                  <X className="h-3 w-3 mr-1" />Clear Filters
                </Button>
              )}
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-body">{listings.length} business{listings.length !== 1 ? "es" : ""} found</p>
              {totalPages > 1 && <p className="text-xs text-muted-foreground font-body">Page {currentPage} of {totalPages}</p>}
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="rounded-xl bg-muted animate-pulse h-72" />)}
              </div>
            ) : listings.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginated.map(l => <ListingCard key={l.id} listing={l} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                    <button
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-border text-sm font-body font-medium disabled:opacity-40 hover:bg-secondary/60 transition-colors"
                    >Previous</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-10 h-10 rounded-lg text-sm font-body font-medium transition-colors ${
                          page === currentPage
                            ? "bg-primary text-primary-foreground"
                            : "border border-border hover:bg-secondary/60"
                        }`}
                      >{page}</button>
                    ))}
                    <button
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border border-border text-sm font-body font-medium disabled:opacity-40 hover:bg-secondary/60 transition-colors"
                    >Next</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground font-body">No businesses match your search criteria.</p>
                <Button variant="outline" className="mt-4 font-body" onClick={clearAll}>Clear All Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PullToRefreshWrapper>
  );
}