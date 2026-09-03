import { ShieldCheck, Lock, FileCheck, Eye, MessageSquare, CreditCard } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified sellers",
    description: "Seller identity checks help buyers know who they are dealing with before starting a serious conversation.",
  },
  {
    icon: Lock,
    title: "Private business details",
    description: "Confidential information is kept behind the appropriate access step instead of being left open to everyone.",
  },
  {
    icon: FileCheck,
    title: "Business documents",
    description: "Supporting documents can be submitted with a listing and reviewed as part of the listing process.",
  },
  {
    icon: Eye,
    title: "Fraud checks",
    description: "The platform uses checks to help flag suspicious listings, duplicate accounts and misleading information.",
  },
  {
    icon: MessageSquare,
    title: "Private in-app chat",
    description: "Keep early conversations on the platform while you decide whether an opportunity is worth pursuing.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa payments",
    description: "Where a payment is required, the platform uses M-Pesa STK Push and records the payment result.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 sm:py-24 bg-secondary/35 border-y border-border/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Built for real transactions</p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            The important details stay in view.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-8">
            Buying an established business takes more than a listing page. LATIELLE MARKET HUB brings the search, seller checks, documents, conversations and payments into one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-6">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
