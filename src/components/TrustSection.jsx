import { ShieldCheck, Lock, FileCheck, Eye, MessageSquare, CreditCard } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Seller identity checks",
    description: "Sellers complete an identity check before they can publish a listing.",
  },
  {
    icon: Lock,
    title: "Private business details",
    description: "Financial records, supplier information and other private details are only released through the platform after the required approval.",
  },
  {
    icon: FileCheck,
    title: "Business documents reviewed",
    description: "Documents submitted with a listing are checked by our team, and the listing shows the relevant review status.",
  },
  {
    icon: Eye,
    title: "Fraud checks",
    description: "We look for duplicate accounts, suspicious listings and information that does not appear consistent.",
  },
  {
    icon: MessageSquare,
    title: "In-platform chat",
    description: "Buyers and sellers can communicate through the platform before deciding whether to exchange contact details.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa payments",
    description: "Payments are made through M-Pesa STK Push, with the payment status recorded on the platform.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            {"Checks that help buyers and sellers"}
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