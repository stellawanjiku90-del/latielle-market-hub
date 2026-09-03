import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-heading text-lg font-bold">LATIELLE MARKET HUB</span>
            </div>
            <p className="text-sm opacity-80 max-w-md leading-relaxed">
              A marketplace for buying and selling established businesses across Kenya.
            </p>
            <p className="text-xs opacity-50 mt-3">
              Contact: <a href="mailto:realityofafrica2023@gmail.com" className="underline hover:opacity-80">realityofafrica2023@gmail.com</a>
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider opacity-80">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link to="/browse" className="text-sm opacity-70 hover:opacity-100 transition-opacity">Browse Businesses</Link>
              <Link to="/how-it-works" className="text-sm opacity-70 hover:opacity-100 transition-opacity">How It Works</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider opacity-80">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/terms" className="text-sm opacity-70 hover:opacity-100 transition-opacity">{"Terms & Conditions"}</Link>
              <Link to="/refund-policy" className="text-sm opacity-70 hover:opacity-100 transition-opacity">Refund Policy</Link>
              <Link to="/privacy-policy" className="text-sm opacity-70 hover:opacity-100 transition-opacity">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-background/10 mt-10 pt-6 text-center">
          <p className="text-xs opacity-50">{"© "}{new Date().getFullYear()}{" LATIELLE MARKET HUB. All rights reserved."}</p>
        </div>
      </div>
    </footer>
  );
}