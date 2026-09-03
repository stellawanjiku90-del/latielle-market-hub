import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. Using the platform",
    content: "By creating an account or using LATIELLE MARKET HUB, you agree to use the platform lawfully and to provide information that is accurate to the best of your knowledge.",
  },
  {
    title: "2. Accounts",
    content: "Keep your phone number and PIN secure. Do not use another person's account or provide false information. We may suspend an account when there is evidence of fraud, misuse or a serious breach of these terms.",
  },
  {
    title: "3. Business listings",
    content: "Sellers are responsible for the information, photos and documents they submit. Listings may be reviewed before publication. Sellers must update or remove information that is no longer accurate.",
  },
  {
    title: "4. Confidential information",
    content: "Some listing information is available only to approved buyers. A buyer who receives confidential information must keep it private and must not copy, publish or share it without permission.",
  },
  {
    title: "5. Payments",
    content: "Payments made through LATIELLE MARKET HUB are processed through the payment method shown at checkout. M-Pesa payments are confirmed after the payment provider returns the transaction result. Refunds are handled under the Refund Policy.",
  },
  {
    title: "6. Fraud and misuse",
    content: "Do not submit false listings, impersonate another person, attempt to bypass platform controls or use the platform to defraud another user. Suspicious activity may be reported to us and may result in account restrictions.",
  },
  {
    title: "7. Buying and selling",
    content: "The final terms of a business sale are agreed between the buyer and seller. Users are responsible for reviewing the information available to them and completing any checks they consider necessary before entering a transaction.",
  },
  {
    title: "8. Account deletion",
    content: "To request deletion of your account and associated personal information, email realityofafrica2023@gmail.com from your registered contact details.",
  },
  {
    title: "9. Contact",
    content: "Questions, complaints and reports can be sent to realityofafrica2023@gmail.com.",
  },
];

export default function Terms() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="font-heading text-3xl font-bold mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">Last updated: August 2026</p>
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
