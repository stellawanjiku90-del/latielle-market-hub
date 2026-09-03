import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Lock, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATS = [
  { value: "10,000+", label: "Established businesses" },
  { value: "1,000,000+", label: "Buyers" },
  { value: "47", label: "Counties" },
];

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary">
            <MapPinned className="h-4 w-4" />
            Across all 47 counties
          </div>

          <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
            Buy and sell established businesses across Kenya.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-7">
            Find established businesses for sale by location, category and price, or list a business you are ready to sell.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                aria-label="Search businesses"
                placeholder="Search by business, category or county"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-11 h-12 text-base bg-card"
              />
            </div>
            <Button type="submit" className="h-12 px-7 text-base">Search</Button>
          </form>

          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Seller checks</span>
            <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />Confidential details</span>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
            {STATS.map((stat) => (
              <div key={stat.label} className="border-l-2 border-primary pl-4">
                <div className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
