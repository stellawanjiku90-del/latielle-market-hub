import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ShieldCheck } from "lucide-react";
import HeroSection from "../components/HeroSection";
import TrustSection from "../components/TrustSection";
import ListingCard from "../components/ListingCard";

const TESTIMONIALS = [
  { name: "James Mwangi", county: "Nairobi, Westlands", text: "I listed my hardware shop on LATIELLE MARKET HUB and had three serious inquiries within the first week. The buyer verification process gave me peace of mind — I knew I was dealing with genuine buyers." },
  { name: "Grace Wanjiku", county: "Mombasa, Nyali", text: "I was looking for a salon business in Mombasa for months. Through this platform I found a verified listing in Nyali with full financial records. The whole process was transparent and professional." },
  { name: "Peter Kamau", county: "Nakuru Town", text: "Selling my cyber café used to feel risky — you never know who is genuine. The M-Pesa payment system and seller verification made everything straightforward. Highly recommend to any business owner." },
];

export default function Home() {
  const { user, isLoadingAuth, authChecked, dashboardFor } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authChecked || isLoadingAuth || user) return;
    api.entities.BusinessListing.filter({ status: "approved" }, "-created_date", 6)
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authChecked, isLoadingAuth, user]);

  if (!authChecked || isLoadingAuth) {
    return <div className="min-h-[60vh] flex items-center justify-center" aria-label="Loading marketplace"><div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" /></div>;
  }
  if (user) return <Navigate to={dashboardFor(user)} replace />;

  return (
    <div className="bg-background">
      <HeroSection />

      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Latest opportunities</p>
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Businesses for sale</h2>
              <p className="mt-2 text-muted-foreground">Explore established businesses currently available on the marketplace.</p>
            </div>
            <Link to="/browse">
              <Button variant="outline" className="gap-2 font-body">
                Browse all businesses <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading businesses">
              {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl bg-muted animate-pulse h-72" />)}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/25 px-6 py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">New listings are on the way.</h3>
              <p className="mt-2 max-w-lg mx-auto text-muted-foreground">If you are selling an established business, you can start your listing and put it in front of interested buyers.</p>
              <Link to="/create-listing">
                <Button className="mt-6">List your business</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <TrustSection />

      <section className="py-20 sm:py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">From our community</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">What buyers and sellers say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((testimonial) => (
              <article key={testimonial.name} className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-5" aria-label="5 out of 5 stars">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />)}
                </div>
                <p className="text-[15px] text-muted-foreground leading-7">“{testimonial.text}”</p>
                <div className="mt-6 pt-5 border-t border-border">
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{testimonial.county}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Your next move</p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Ready to buy or sell?</h2>
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-7 text-primary-foreground/90">
            Search the marketplace if you are looking for an opportunity, or start a listing if you have an established business to sell.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/browse"><Button size="lg" variant="secondary" className="w-full sm:w-auto">Browse businesses</Button></Link>
            <Link to="/create-listing"><Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">Sell a business</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
