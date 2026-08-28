import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATS = [
  { value: "500+", label: "Businesses listed" },
  { value: "2,000+", label: "M-Pesa payments" },
  { value: "47", label: "Counties covered" },
];

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative flex items-center bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 w-full">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5" />
              Business marketplace
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight max-w-3xl">
            Buy and sell businesses in Kenya
          </h1>
          
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-7">
            Browse businesses for sale, compare listings and contact sellers through the marketplace.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business, category or location"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-sm bg-background border-border/80"
              />
            </div>
            <Button type="submit" className="h-12 px-6 font-body">Search</Button>
          </form>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />Seller checks</div>
            <div className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" />Private details</div>
            <div className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" />M-Pesa payments</div>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-5">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}