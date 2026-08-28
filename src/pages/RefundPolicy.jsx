import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. General Policy",
    content: "Fees are normally non-refundable after the service connected to the payment has been provided or the listing or request has entered processing."
  },
  {
    title: "2. Listing Fees",
    content: "A listing fee is non-refundable once a listing has been submitted for review. If we reject a paid listing for a reason covered by our own content rules and the service has not otherwise been used, we may issue a refund. Any refund decision will be communicated to the seller."
  },
  {
    title: "3. Detail Request Fees",
    content: "A detail request fee is normally non-refundable once the request has been submitted and processing has started. The fee does not guarantee that a seller will agree to release confidential information."
  },
  {
    title: "4. Duplicate or Failed Payments",
    content: "If you were charged more than once for the same service, or a technical problem resulted in a payment being taken without the service being delivered, contact us so we can check the transaction records."
  },
  {
    title: "5. Fraud or Misrepresentation",
    content: "If our investigation confirms that a seller materially misrepresented a listing, we may refund an affected buyer where appropriate. Each case is reviewed using the information available to us."
  },
  {
    title: "6. How to Request a Refund",
    content: "Email realityofafrica2023@gmail.com with your M-Pesa receipt number, the phone number used for payment, the account email if applicable, and a short description of the problem. Do not send your M-Pesa PIN."
  },
  {
    title: "7. Processing",
    content: "Approved refunds are normally processed within 7 business days. The exact timing can also depend on the payment provider."
  },
  {
    title: "8. Contact",
    content: "For refund questions, contact realityofafrica2023@gmail.com. We aim to respond to refund requests within 48 hours."
  }
];

export default function RefundPolicy() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">Last updated: August 2026</p>
        <div className="space-y-8">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">{section.title}</h2>
              <p className="text-base text-muted-foreground font-body leading-7">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}