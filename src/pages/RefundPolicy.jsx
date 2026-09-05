import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. General Policy",
    content: "All fees paid on Latielle Market Hub — including listing fees and detail request fees — are generally non-refundable once the service has been activated. This policy exists because our team invests time and resources in reviewing listings and facilitating buyer-seller connections the moment payment is received."
  },
  {
    title: "2. Listing Fees (Sellers)",
    content: "Listing fees (KES 2,000 for Basic, KES 3,000 for Featured, and KES 4,000 for Premium) are non-refundable once your listing has been submitted for review. If your listing is rejected due to our content policy, a full refund will be issued within 7 business days. If you withdraw your listing after approval, no refund will be granted."
  },
  {
    title: "3. Detail Request Fees (Buyers)",
    content: "The KES 1,000 detail request fee is non-refundable once the request has been submitted, regardless of whether the seller approves or rejects the request. This fee covers the administrative cost of facilitating the request and verifying buyer intent."
  },
  {
    title: "4. Exceptional Circumstances",
    content: "Refunds may be considered on a case-by-case basis in the following situations: duplicate payments made in error, technical failures that prevented service delivery, or fraudulent activity confirmed by our team after investigation. To request a refund under these circumstances, contact us within 48 hours of the transaction."
  },
  {
    title: "5. Fraud & Misrepresentation",
    content: "If a seller is found to have provided materially false information in their listing, buyers who paid the detail request fee may be eligible for a full refund. LATIELLE MARKET HUB will investigate all such claims and issue refunds where fraud is confirmed. Sellers found guilty of misrepresentation will have their accounts permanently suspended."
  },
  {
    title: "6. How to Request a Refund",
    content: "To request a refund, email us at realityofafrica2023@gmail.com with your M-Pesa receipt number, registered email address, and a brief explanation of the issue. We aim to respond to all refund requests within 48 hours and process approved refunds within 7 business days via M-Pesa."
  },
  {
    title: "7. Contact",
    content: "For all refund-related queries, email: realityofafrica2023@gmail.com. Include your transaction details to help us resolve your issue as quickly as possible."
  }
];

export default function RefundPolicy() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="font-heading text-3xl font-bold mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">Last updated: September 2026</p>
        <div className="space-y-8">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}