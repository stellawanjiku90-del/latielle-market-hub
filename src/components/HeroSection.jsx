import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Lock, MapPinned, ArrowRight, Store, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TRUST_POINTS = [
  { value: "Seller checks", label: "identity and listing review" },
  { value: "Private details", label: "shared through the platform" },
  { value: "M-Pesa", label: "for required payments" },
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
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
      <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20">
        <div className="grid lg:grid-cols-[1.12fr_0.88fr] gap-12 xl:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primary">
              <MapPinned className="h-4 w-4" />
              Built for the Kenyan market
            </div>

            <h1 className="mt-6 max-w-3xl font-heading text-4xl sm:text-5xl lg:text-[4.1rem] font-bold tracking-[-0.035em] text-foreground leading-[1.02]">
              Find a business worth taking over.
            </h1>

            <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-8">
              Browse established businesses for sale across Kenya, compare opportunities and connect with sellers when you find the right fit.
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label="Search businesses"
                  placeholder="Search by business, category or county"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-12 h-14 text-base bg-card border-input shadow-sm rounded-xl"
                />
              </div>
              <Button type="submit" className="h-14 px-8 text-base rounded-xl shadow-sm">
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Seller checks</span>
              <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />Private business details</span>
              <span className="inline-flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" />M-Pesa payments</span>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl border-t border-border pt-7">
              {TRUST_POINTS.map((point) => (
                <div key={point.value}>
                  <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">{point.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground leading-5">{point.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative rounded-3xl border border-border bg-card p-7 shadow-[0_24px_70px_-30px_hsl(var(--navy)/0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">The marketplace</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">A better way to find an existing business.</h2>
                </div>
                <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Search className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Start with what you know</p>
                      <p className="text-sm text-muted-foreground">Search by county, category or price.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Look for checked sellers</p>
                      <p className="text-sm text-muted-foreground">Seller checks and listing review help you assess an opportunity.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Talk before you decide</p>
                      <p className="text-sm text-muted-foreground">Use the platform to discuss a listing and request details.</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="mt-6 w-full h-11 rounded-xl" onClick={() => navigate("/how-it-works")}>
                See how it works
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
