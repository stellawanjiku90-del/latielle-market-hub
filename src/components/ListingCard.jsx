import { Link } from "react-router-dom";
import { MapPin, Clock, Users, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import VerificationBadge from "./VerificationBadge";
import WatermarkedMedia from "./WatermarkedMedia";
import ViewCount from "./ViewCount";

const PLACEHOLDER_IMG = "/listing-placeholder.svg";

function formatPrice(price) {
  if (!price) return "Price on request";
  return `KES ${price.toLocaleString()}`;
}

export default function ListingCard({ listing }) {
  const imgSrc = listing.photos?.[0] || categoryImages[listing.category] || PLACEHOLDER_IMG;

  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full">
        <div className="relative aspect-[4/3] overflow-hidden">
          <WatermarkedMedia
            src={imgSrc}
            alt={listing.title ? `${listing.title} business listing` : `${listing.category || "Business"} listing image`}
            className="group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            <span className="bg-foreground/80 text-background text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
              {listing.category}
            </span>
            {listing.listing_type === "premium" && <VerificationBadge type="premium" size="sm" />}
            {listing.is_featured && <VerificationBadge type="featured" size="sm" />}
            {listing.is_verified && <VerificationBadge type="business_verified" size="sm" />}
          </div>
          <div className="absolute bottom-3 right-3">
            <span className="bg-background/95 text-foreground text-sm font-bold px-3 py-1 rounded-lg shadow-sm backdrop-blur-sm">
              {formatPrice(listing.asking_price)}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <ViewCount count={listing.views_count} className="bg-background/95 text-foreground px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm" />
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-heading text-base font-semibold text-foreground line-clamp-1">
            {listing.title || `${listing.category} for Sale`}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-body">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-primary/70" />
              {listing.county}
            </div>
            {listing.years_operating && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary/70" />
                {listing.years_operating} yrs
              </div>
            )}
            {listing.employees && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-primary/70" />
                {listing.employees} staff
              </div>
            )}
            {listing.monthly_revenue_range && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary/70" />
                {listing.monthly_revenue_range.replace("KES ", "").split(" - ")[0]}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}