import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, LogIn, UserPlus, ShieldCheck, TrendingUp, CheckCircle2 } from "lucide-react";
import HeroSection from "../components/HeroSection";
import TrustSection from "../components/TrustSection";
import ListingCard from "../components/ListingCard";

const TESTIMONIALS = [
  { name: "James Mwangi", county: "Nairobi, Westlands", text: "I listed my hardware shop on LATIELLE MARKET HUB and had three serious inquiries within the first week. The buyer verification process gave me peace of mind — I knew I was dealing with genuine buyers." },
  { name: "Grace Wanjiku", county: "Mombasa, Nyali", text: "I was looking for a salon business in Mombasa for months. Through this platform I found a verified listing in Nyali with full financial records. The whole process was transparent and professional." },
  { name: "Peter Kamau", county: "Nakuru Town", text: "Selling my cyber café used to feel risky — you never know who is genuine. The M-Pesa payment system and seller verification made everything straightforward. Highly recommend to any business owner." },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState(() => getSession());

  useEffect(() => {
    base44.entities.BusinessListing.filter({ status: "approved" }, "-created_date", 6)
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <HeroSection />

      {/* Inline Auth Section for guests */}
      {!user && (
        <section className="py-12 bg-gradient-to-r from-primary/5 via-background to-accent/5 border-y border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 text-center lg:text-left">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Join Kenya's Trusted Business Marketplace — LATIELLE MARKET HUB</h2>
                <p className="mt-2 text-muted-foreground font-body">Create an account to list, browse, or request confidential business details.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <div className="bg-card border border-border/60 rounded-xl p-5 text-center w-56 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-base font-semibold mb-1">New User?</h3>
                  <p className="text-xs text-muted-foreground font-body mb-3">Create your free account today</p>
                  <Link to="/login"><Button className="w-full font-body text-sm">Sign Up Free</Button></Link>
                  </div>
                  <div className="bg-card border border-border/60 rounded-xl p-5 text-center w-56 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <LogIn className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h3 className="font-heading text-base font-semibold mb-1">Returning?</h3>
                  <p className="text-xs text-muted-foreground font-body mb-3">Sign in to your account</p>
                  <Link to="/login"><Button variant="outline" className="w-full font-body text-sm">Sign In</Button></Link>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-muted-foreground font-body">
              {["Verified seller badges", "Protected confidential details", "M-Pesa payments", "Fraud monitoring"].map(f => (
                <div key={f} className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{f}</div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Listings */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">Featured Businesses</h2>
              <p className="mt-2 text-muted-foreground font-body">Verified businesses currently available for sale</p>
            </div>
            <Link to="/browse">
              <Button variant="outline" className="hidden sm:flex gap-2 font-body">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-xl bg-muted animate-pulse h-72" />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(listing => <ListingCard key={listing.id} listing={listing} />)}
            </div>
          ) : (
            <div className="text-center py-16 bg-secondary/30 rounded-2xl">
              <p className="text-muted-foreground font-body">New listings coming soon. Be the first to list your business.</p>
              <Link to="/create-listing"><Button className="mt-4 font-body">List Your Business</Button></Link>
            </div>
          )}
          <div className="mt-6 text-center sm:hidden">
            <Link to="/browse"><Button variant="outline" className="gap-2 font-body">View All Businesses <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      <TrustSection />

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-card border border-border/50 rounded-xl p-6">
                <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}</div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">"{t.text}"</p>
                <div className="font-body">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.county}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">Ready to Get Started?</h2>
          <p className="mt-4 font-body opacity-90">Join Kenya's most trusted business marketplace. List your business or find your next investment on LATIELLE MARKET HUB.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/create-listing"><Button size="lg" variant="secondary" className="font-body">Sell a Business</Button></Link>
            <Link to="/browse"><Button size="lg" variant="outline" className="font-body border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">Browse Businesses</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}