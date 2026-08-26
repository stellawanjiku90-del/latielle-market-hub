import { ShieldCheck, Lock, FileCheck, Eye, MessageSquare, CreditCard } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Identity Verified Sellers",
    description: "Every seller undergoes ID and selfie verification before listing. Look for the Verified Seller badge.",
  },
  {
    icon: Lock,
    title: "Protected Confidential Details",
    description: "Sensitive business information is locked until buyers verify and pay. No casual browsing of private data.",
  },
  {
    icon: FileCheck,
    title: "Documents Reviewed",
    description: "Uploaded business documents are reviewed by our team. Listings show review status transparently.",
  },
  {
    icon: Eye,
    title: "Fraud Monitoring",
    description: "Automated and manual checks flag suspicious listings, duplicate accounts, and misleading information.",
  },
  {
    icon: MessageSquare,
    title: "Secure In-Platform Chat",
    description: "Communicate safely within the platform before sharing personal contact details.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa Payments",
    description: "All payments via M-Pesa STK Push. Transparent pricing, instant confirmation, digital receipts.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            {"Built on Trust & Verification"}
          </h2>
          <p className="mt-4 text-muted-foreground font-body leading-relaxed">
            Unlike ordinary classifieds, LATIELLE MARKET HUB adds multiple layers of verification 
            and protection to create a safer business trading environment.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground/70 font-body max-w-xl mx-auto">
            <strong>Disclaimer:</strong> LATIELLE MARKET HUB is an independent marketplace. Verification is enhanced but not a government process. 
            Buyers should independently verify business details before making investment decisions.
          </p>
        </div>
      </div>
    </section>
  );
}