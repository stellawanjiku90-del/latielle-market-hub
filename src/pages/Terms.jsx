import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. About LATIELLE MARKET HUB",
    content: "LATIELLE MARKET HUB is an independent digital marketplace that connects business sellers with potential buyers in Kenya. We are NOT a government authority, NOT a licensing body, NOT a legal advisory service, and NOT an official business verification authority. We provide enhanced seller and buyer verification to promote safer transactions, but we do not guarantee the accuracy of any business information listed on the platform."
  },
  {
    title: "2. User Accounts",
    content: "Users must provide accurate information when registering. Sellers must verify their identity through ID and selfie uploads. Buyers must register and verify their accounts before requesting confidential business details. We reserve the right to suspend or terminate accounts that violate our terms or are involved in fraudulent activity."
  },
  {
    title: "3. Business Listings",
    content: "All business listings are submitted by sellers and reviewed by our team before publication. The review process includes checking for completeness and basic consistency, but does NOT constitute official business verification, certification, or endorsement. Business information is provided by the seller and LATIELLE MARKET HUB does not guarantee its accuracy, completeness, or truthfulness."
  },
  {
    title: "4. Verification Badges",
    content: "Verification badges such as 'Verified Seller', 'Documents Reviewed', and 'Identity Confirmed' indicate that the seller has completed our internal verification process. These badges do NOT represent government verification, official business certification, guaranteed profitability, or legal/financial guarantees of any kind."
  },

  {
    title: "6. Confidential Information",
    content: "Confidential business information (exact location, financial documents, supplier details, staff information, seller contact) is protected and only shared with buyers who have paid the required fee and been approved by the seller. Buyers must not share confidential information with third parties without the seller's written consent."
  },
  {
    title: "7. Fraud Prevention",
    content: "We actively monitor the platform for fraudulent activity, duplicate listings, and suspicious behavior. Users can report suspicious listings or users. We may take action including suspension of accounts found to be engaging in fraudulent or deceptive practices."
  },
  {
    title: "8. Disclaimer of Liability",
    content: "LATIELLE MARKET HUB provides a marketplace platform only. We do not participate in negotiations, transactions, or agreements between buyers and sellers. We do not guarantee the profitability, viability, or legitimacy of any business listed. Buyers should conduct their own due diligence, including hiring professional advisors, before making any business purchase decisions. LATIELLE MARKET HUB is not liable for any losses arising from transactions between users."
  },

  {
    title: "9. Data Deletion",
    content: "Users may request deletion of their account and associated personal data at any time by contacting us at realityofafrica2023@gmail.com. We will process all deletion requests within 30 days in compliance with applicable data protection laws."
  },
  {
    title: "10. Contact",
    content: "For questions, concerns, or to report fraud, contact us at: realityofafrica2023@gmail.com. We aim to respond to all inquiries within 48 hours."
  },
];

export default function Terms() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="font-heading text-3xl font-bold mb-2">{"Terms & Conditions"}</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">Last updated: May 2025</p>
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