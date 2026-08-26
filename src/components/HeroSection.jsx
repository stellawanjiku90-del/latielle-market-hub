import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATS = [
  { value: "500+", label: "Verified Businesses" },
  { value: "2,000+", label: "Trusted Buyers" },
  { value: "47", label: "Counties Covered" },
];

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5" />
              Trusted Marketplace
            </span>
          </div>
          
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            {"Buy & Sell"} <br />
            <span className="text-primary">Verified Businesses</span>
            <br />in Kenya
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground font-body max-w-xl leading-relaxed">
            A premium marketplace where verified sellers meet verified buyers. 
            Enhanced identity checks, protected confidential details, and safer transactions.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search businesses, categories, locations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-sm font-body bg-background border-border/80"
              />
            </div>
            <Button type="submit" className="h-12 px-6 font-body">Search</Button>
          </form>

          <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground font-body">
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />Seller Verified</div>
            <div className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" />Confidential</div>
            <div className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" />Trusted</div>
          </div>

          <div className="mt-12 flex gap-8">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground font-body mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}