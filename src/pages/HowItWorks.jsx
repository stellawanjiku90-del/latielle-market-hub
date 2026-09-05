import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Upload, Eye, CreditCard, MessageSquare, CheckCircle } from "lucide-react";

const SELLER_STEPS = [
  { icon: ShieldCheck, title: "Verify Your Identity", desc: "Upload your National ID, selfie, and optional business documents. Our team reviews your submission." },
  { icon: Upload, title: "Create a Listing", desc: "Fill in business details, upload photos, and set your asking price. Choose a Basic (KES 2,000), Featured (KES 3,000) or Premium (KES 4,000) listing package and pay the applicable fee through M-Pesa." },
  { icon: Eye, title: "Listing Reviewed", desc: "Our team reviews your listing for completeness and quality. Approved listings go live on the marketplace." },
  { icon: MessageSquare, title: "Connect with Buyers", desc: "Receive detail requests from verified buyers. Approve requests to share confidential information and chat securely." },
];

const BUYER_STEPS = [
  { icon: ShieldCheck, title: "Create an Account", desc: "Create an account with your phone number and 4-digit PIN." },
  { icon: Eye, title: "Browse Businesses", desc: "Search established businesses by category, county, price and other public listing information." },
  { icon: CreditCard, title: "Request Details", desc: "Pay the KES 1,000 detail-request fee through M-Pesa, then submit your request for confidential business information. The request moves through the platform approval process." },
  { icon: CheckCircle, title: "Get Approved", desc: "When the request is approved, access the confidential information made available for that listing and continue the conversation through the platform." },
];

export default function HowItWorks() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">How Latielle Market Hub Works</h1>
          <p className="mt-3 text-muted-foreground font-body max-w-xl mx-auto">A step-by-step guide to buying or selling a business safely on our platform.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-heading text-2xl font-bold mb-6 text-center">For Sellers</h2>
            <div className="space-y-6">
              {SELLER_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    {i < SELLER_STEPS.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                  </div>
                  <div className="pb-6">
                    <h3 className="font-heading text-base font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-heading text-2xl font-bold mb-6 text-center">For Buyers</h2>
            <div className="space-y-6">
              {BUYER_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                      <step.icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    {i < BUYER_STEPS.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                  </div>
                  <div className="pb-6">
                    <h3 className="font-heading text-base font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login?role=seller"><Button size="lg" className="font-body">Start Selling</Button></Link>
            <Link to="/browse"><Button size="lg" variant="outline" className="font-body">Browse Businesses</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}