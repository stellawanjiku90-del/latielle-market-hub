import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, Clock, TrendingUp } from "lucide-react";

const MAX_SOLD_RECORDS = 30;
const SOLD_EXPIRY_DAYS = 60;

const categoryImages = {
  "Restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=260&fit=crop",
  "Salon": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=260&fit=crop",
  "Hotel": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=260&fit=crop",
  "Pharmacy": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=260&fit=crop",
  "Supermarket": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=260&fit=crop",
  "Gym": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=260&fit=crop",
};

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function SoldBusinesses() {
  const [sold, setSold] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let soldListings = await api.entities.BusinessListing.filter({ status: "sold" }, "-sold_at", 100);

      // Auto-cleanup: delete listings sold more than SOLD_EXPIRY_DAYS ago
      const expired = soldListings.filter(l => daysSince(l.sold_at) > SOLD_EXPIRY_DAYS);
      for (const l of expired) {
        await api.entities.BusinessListing.delete(l.id);
      }

      // Keep latest records only if exceeds MAX
      soldListings = soldListings.filter(l => daysSince(l.sold_at) <= SOLD_EXPIRY_DAYS);
      if (soldListings.length > MAX_SOLD_RECORDS) {
        const toDelete = soldListings.slice(MAX_SOLD_RECORDS);
        for (const l of toDelete) {
          await api.entities.BusinessListing.delete(l.id);
        }
        soldListings = soldListings.slice(0, MAX_SOLD_RECORDS);
      }

      setSold(soldListings);
      setLoading(false);
    };
    init().catch(() => setLoading(false));
  }, []);

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Sold Businesses</h1>
          </div>
          <p className="text-muted-foreground font-body ml-12">
            Businesses successfully sold through Latielle Market Hub. Records kept for {SOLD_EXPIRY_DAYS} days.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="rounded-xl bg-muted animate-pulse h-64" />)}
          </div>
        ) : sold.length === 0 ? (
          <div className="text-center py-20 bg-muted rounded-2xl">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-body">No sold businesses to display yet.</p>
            <Link to="/browse" className="text-sm text-primary font-body mt-2 inline-block hover:underline">Browse available businesses →</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground font-body mb-6">{sold.length} business{sold.length !== 1 ? "es" : ""} sold</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sold.map(listing => {
                const img = listing.photos?.[0] || categoryImages[listing.category] || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=260&fit=crop";
                return (
                  <Card key={listing.id} className="overflow-hidden border-border/60 opacity-85">
                    <div className="relative aspect-[4/3] overflow-hidden grayscale">
                      <img src={img} alt={listing.category} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
                        <span className="bg-primary text-primary-foreground font-heading font-bold text-lg px-6 py-2 rounded-full shadow-lg">
                          SOLD
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading text-sm font-semibold text-foreground line-clamp-1">
                          {listing.title || `${listing.category} — ${listing.county}`}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{listing.category}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground font-body">
                        <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.county}</div>
                        {listing.sold_price && (
                          <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />KES {listing.sold_price.toLocaleString()}</div>
                        )}
                        {listing.sold_at && (
                          <div className="flex items-center gap-1 col-span-2">
                            <Clock className="h-3 w-3" />
                            Sold {daysSince(listing.sold_at)} day{daysSince(listing.sold_at) !== 1 ? "s" : ""} ago
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}