import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "1. About LATIELLE MARKET HUB",
    content: "LATIELLE MARKET HUB is a private marketplace that connects people who want to buy or sell businesses in Kenya. We are not a government authority, licensing body or professional advisory service."
  },
  {
    title: "2. Accounts",
    content: "You must provide information that is true and current when you create an account. Keep your PIN and account information private. We may suspend an account where there is evidence of fraud, abuse or a serious breach of these terms."
  },
  {
    title: "3. Seller Listings",
    content: "Sellers are responsible for the information in their listings. We review submitted listings for completeness and obvious issues, but our review is not a government certification and does not guarantee that a business is profitable or that every statement made by a seller is correct."
  },
  {
    title: "4. Verification",
    content: "A verification or document-review label means that the stated check was completed by LATIELLE MARKET HUB. It is not a government certificate, guarantee of income or guarantee that a transaction is safe."
  },
  {
    title: "5. Payments and Fees",
    content: "Fees shown on the platform must be paid through the payment method provided. A payment does not by itself create a sale or transfer ownership of a business. Refunds are handled under our Refund Policy."
  },
  {
    title: "6. Confidential Information",
    content: "Private business information is supplied for the buyer\'s evaluation of the listed business. You must not copy, publish or pass that information to another person without the seller\'s permission."
  },
  {
    title: "7. Prohibited Conduct",
    content: "Do not use the platform to impersonate another person, submit false documents, mislead another user, attempt to bypass payment or verification controls, or use the service for unlawful activity."
  },
  {
    title: "8. Transactions Between Users",
    content: "LATIELLE MARKET HUB provides the marketplace and communication tools. Buyers and sellers remain responsible for their own negotiations, checks, agreements and decisions. Buyers should carry out independent due diligence before paying for a business."
  },
  {
    title: "9. Account and Data Deletion",
    content: "You may ask for your account to be deleted by contacting realityofafrica2023@gmail.com. Some records may need to be retained where required by law or for legitimate business records."
  },
  {
    title: "10. Contact",
    content: "For questions, complaints or reports of suspected fraud, contact realityofafrica2023@gmail.com. Please do not send your PIN or payment password by email."
  }
];

export default function Terms() {
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{"Terms & Conditions"}</h1>
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