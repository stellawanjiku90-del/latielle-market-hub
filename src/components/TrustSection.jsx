import { ShieldCheck, Lock, FileCheck, Eye, MessageSquare, CreditCard } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Seller checks",
    description: "Seller identity information is checked before a listing can be published.",
  },
  {
    icon: Lock,
    title: "Private details",
    description: "Financial records and other private business information are kept out of the public listing and released only through the platform when approved.",
  },
  {
    icon: FileCheck,
    title: "Document review",
    description: "Documents submitted with a listing are reviewed, and the listing shows its review status.",
  },
  {
    icon: Eye,
    title: "Fraud checks",
    description: "We check for duplicate accounts, suspicious listings and information that does not match.",
  },
  {
    icon: MessageSquare,
    title: "Chat on the platform",
    description: "Buyers and sellers can message each other through the platform before sharing contact details.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa payments",
    description: "Registration and other supported payments are made through M-Pesa STK Push, with the result recorded on the platform.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {"How the marketplace works"}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We check seller information, review documents submitted with listings, and keep private details within the platform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-600 max-w-xl mx-auto">
            <strong>Important:</strong> LATIELLE MARKET HUB is an independent marketplace. A verification label does not mean that a business is government-certified or guarantee that a business will be profitable. Buyers should carry out their own checks before completing a purchase.
          </p>
        </div>
      </div>
    </section>
  );
}