import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#101417] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">LATIELLE MARKET HUB</span>
            </div>
            <p className="text-sm text-white/70 max-w-md leading-relaxed">
              A marketplace for buying and selling businesses in Kenya.
            </p>
            <p className="text-sm text-white/65 mt-4">
              Contact: <a href="mailto:realityofafrica2023@gmail.com" className="underline hover:text-white">realityofafrica2023@gmail.com</a>
            </p>
            <p className="text-xs text-white/55 mt-3 max-w-xl leading-5">
              LATIELLE MARKET HUB is an independent marketplace, not a government authority or official verification body.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link to="/browse" className="text-sm text-white/70 hover:text-white transition-colors">Browse Businesses</Link>
              <Link to="/how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">How It Works</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/terms" className="text-sm text-white/70 hover:text-white transition-colors">{"Terms & Conditions"}</Link>
              <Link to="/refund-policy" className="text-sm text-white/70 hover:text-white transition-colors">Refund Policy</Link>
              <Link to="/privacy-policy" className="text-sm text-white/70 hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-xs text-white/55">{"© "}{new Date().getFullYear()}{" LATIELLE MARKET HUB. All rights reserved."}</p>
        </div>
      </div>
    </footer>
  );
}