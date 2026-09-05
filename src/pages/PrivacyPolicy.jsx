import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    content: "We collect personal information including names, email addresses, phone numbers, ID numbers, and selfie photos. This information is collected during account registration and identity verification processes."
  },
  {
    title: "2. How We Use Your Information",
    content: "Your information is used to verify your identity, facilitate transactions between buyers and sellers, and maintain platform security. We use this data to review business listings, process detail requests, and communicate important platform updates with you."
  },
  {
    title: "3. Data Storage & Security",
    content: "We use access controls, authentication safeguards and other reasonable technical and organizational measures to protect personal information against unauthorized access, loss or misuse. No online service can guarantee absolute security."
  },
  {
    title: "4. Sharing of Information",
    content: "We do not sell or rent your personal information to third parties. Your data may be shared only as required to facilitate approved transactions on the platform (e.g., sharing seller contact with an approved buyer), or to comply with applicable legal requirements."
  },
  {
    title: "5. Confidential Business Data",
    content: "Confidential business information uploaded by sellers (financial documents, lease details, supplier info) is only shared with buyers who have paid the required fee and received explicit seller approval. Buyers must not redistribute this information to third parties."
  },
  {
    title: "6. Your Rights",
    content: "You have the right to access, correct, or request deletion of your personal data. To request account or data deletion, please contact us through the platform. We will process your request within a reasonable timeframe in accordance with applicable law."
  },
  {
    title: "7. Cookies",
    content: "Our platform may use cookies and similar technologies to maintain your session, remember your preferences, and improve your experience. You can disable cookies in your browser settings, though this may affect platform functionality."
  },
  {
    title: "8. Changes to This Policy",
    content: "We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated date. Continued use of the platform after changes are posted constitutes your acceptance of the revised policy."
  },
  {
    title: "9. Data Deletion Request",
    content: "You have the right to request deletion of your personal data and account at any time. To submit a deletion request, email us at realityofafrica2023@gmail.com with the subject line 'Data Deletion Request' and include your registered email address. We will process all requests within 30 days."
  },
  {
    title: "10. Contact",
    content: "If you have questions about this Privacy Policy or how your data is handled, please contact us at: realityofafrica2023@gmail.com. We aim to respond to all privacy-related inquiries within 48 hours."
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="font-heading text-3xl font-bold mb-2">Privacy Policy</h1>
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