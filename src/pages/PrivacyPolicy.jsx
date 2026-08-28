import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    content: "When you use LATIELLE MARKET HUB, we may collect your name, phone number, email address, identification details, profile information and documents you choose to upload. We collect this information when you register, verify your account, create a listing or use other parts of the service."
  },
  {
    title: "2. How We Use Your Information",
    content: "We use your information to create and secure your account, verify sellers, process payments, manage listings and requests, and communicate with you about your account. We also use it to investigate reports and protect the marketplace from misuse."
  },
  {
    title: "3. Storage and Security",
    content: "We take reasonable steps to protect information held by the platform. Access to account and verification information is limited to people and systems that need it to operate the service. No online service can guarantee absolute security."
  },
  {
    title: "4. When We Share Information",
    content: "We do not sell your personal information. We may share information when it is needed to provide a service you requested, when you approve the release of private business information, or when disclosure is required by law."
  },
  {
    title: "5. Business Information",
    content: "Sellers may upload financial records, licences, leases, supplier information and other business documents. Information marked or treated as confidential is not intended for public viewing and is released only through the platform\'s approval process."
  },
  {
    title: "6. Your Choices and Rights",
    content: "You may ask us to correct information that is inaccurate and may request deletion of your account and personal information, subject to records we are required to keep by law."
  },
  {
    title: "7. Cookies and Local Storage",
    content: "The website uses browser storage and similar technologies to keep you signed in and remember necessary settings. Your browser may allow you to clear or block these technologies, although doing so can affect some features."
  },
  {
    title: "8. Changes to This Policy",
    content: "If we make a material change to this policy, we will update the date shown on this page. The version published here is the version that applies to your use of the service."
  },
  {
    title: "9. Data Deletion",
    content: "To request deletion of your account or personal information, email realityofafrica2023@gmail.com with the subject 'Data Deletion Request' and include the email address or phone number linked to your account. We will review the request and respond within 30 days."
  },
  {
    title: "10. Contact",
    content: "Questions about privacy can be sent to realityofafrica2023@gmail.com. Please include enough information for us to identify the issue without sending passwords, PINs or other account credentials."
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: August 2026</p>
        <div className="space-y-8">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold text-foreground mb-2">{section.title}</h2>
              <p className="text-base text-muted-foreground leading-7">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}