import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, UserPlus, ShieldCheck, TrendingUp } from "lucide-react";
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
    api.entities.BusinessListing.filter({ status: "approved" }, "-created_date", 6)
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <HeroSection />

      {/* Inline Auth Section for guests */}
      {!user && (
        <section className="py-12 bg-muted/70 border-y border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Buy or sell a business in Kenya</h2>
                <p className="mt-2 text-muted-foreground">Create an account to browse listings, sell a business, or request more information.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <div className="bg-card border border-border/60 rounded-xl p-5 text-center w-56 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">New User?</h3>
                  <p className="text-xs text-muted-foreground mb-3">Create an account to get started</p>
                  <Link to="/login"><Button className="w-full text-sm">Sign Up Free</Button></Link>
                  </div>
                  <div className="bg-card border border-border/60 rounded-xl p-5 text-center w-56 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <LogIn className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Returning?</h3>
                  <p className="text-xs text-muted-foreground mb-3">Sign in to your account</p>
                  <Link to="/login"><Button variant="outline" className="w-full text-sm">Sign In</Button></Link>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-muted-foreground">
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
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Featured Businesses</h2>
              <p className="mt-2 text-muted-foreground">Businesses currently available for sale</p>
            </div>
            <Link to="/browse">
              <Button variant="outline" className="hidden sm:flex gap-2">
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
            <div className="text-center py-16 bg-muted rounded-2xl">
              <p className="text-muted-foreground">New listings coming soon. Be the first to list your business.</p>
              <Link to="/create-listing"><Button className="mt-4">List Your Business</Button></Link>
            </div>
          )}
          <div className="mt-6 text-center sm:hidden">
            <Link to="/browse"><Button variant="outline" className="gap-2">View All Businesses <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      <TrustSection />

      {/* Practical guide */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground">A simple place to buy or sell a business</h2>
            <p className="mt-3 text-muted-foreground">Use the marketplace to find a business, review the information available, and contact the seller.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">Looking to buy?</h3>
              <p className="text-sm text-muted-foreground leading-6">Search by business type or location, open a listing, and request the information you need before making a decision.</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">Selling a business?</h3>
              <p className="text-sm text-muted-foreground leading-6">Create a listing, provide the required documents, and respond to buyers through the platform.</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">Keep private details private</h3>
              <p className="text-sm text-muted-foreground leading-6">Sensitive business information is not displayed publicly. Approved requests are handled through the platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to buy or sell?</h2>
          <p className="mt-4 text-white/90">Browse businesses for sale or create a listing for your own business.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/create-listing"><Button size="lg" variant="secondary" className="font-body">Sell a Business</Button></Link>
            <Link to="/browse"><Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">Browse Businesses</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}