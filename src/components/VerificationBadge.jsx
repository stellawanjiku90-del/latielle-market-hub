import { ShieldCheck, Award, FileCheck, BadgeCheck } from "lucide-react";

const BADGE_CONFIG = {
  verified_seller: { icon: ShieldCheck, label: "Verified Seller", className: "bg-primary/10 text-primary border-primary/20" },
  business_verified: { icon: BadgeCheck, label: "Verified Business", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  documents_reviewed: { icon: FileCheck, label: "Documents Reviewed", className: "bg-blue-50 text-blue-700 border-blue-200" },
  premium: { icon: Award, label: "Premium", className: "bg-accent/10 text-accent-foreground border-accent/30" },
  featured: { icon: Award, label: "Featured", className: "bg-accent/15 text-accent-foreground border-accent/30" },
};

export default function VerificationBadge({ type = "verified_seller", size = "sm" }) {
  const config = BADGE_CONFIG[type] || BADGE_CONFIG.verified_seller;
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "text-[10px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex items-center font-body font-medium rounded-full border ${sizeClasses} ${config.className}`}>
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
}