import { Link } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import { Shield, Mail } from "lucide-react";

export default function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={user ? "flex flex-col gap-8" : "grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-10"}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="font-heading text-lg font-bold">LATIELLE MARKET HUB</span>
            </div>
            <p className="text-sm text-background/75 max-w-md leading-6">
              A marketplace for finding, buying and selling established businesses across Kenya.
            </p>
            <a href="mailto:realityofafrica2023@gmail.com" className="mt-4 inline-flex items-center gap-2 text-sm text-background/80 hover:text-background transition-colors">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              realityofafrica2023@gmail.com
            </a>
          </div>

          {!user && (
            <>
              <div>
                <h4 className="font-semibold text-sm mb-4">Platform</h4>
                <div className="flex flex-col gap-3">
                  <Link to="/browse" className="text-sm text-background/70 hover:text-background transition-colors">Browse businesses</Link>
                  <Link to="/how-it-works" className="text-sm text-background/70 hover:text-background transition-colors">How it works</Link>
                  <Link to="/sold-businesses" className="text-sm text-background/70 hover:text-background transition-colors">Sold businesses</Link>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-4">Information</h4>
                <div className="flex flex-col gap-3">
                  <Link to="/terms" className="text-sm text-background/70 hover:text-background transition-colors">Terms & Conditions</Link>
                  <Link to="/refund-policy" className="text-sm text-background/70 hover:text-background transition-colors">Refund Policy</Link>
                  <Link to="/privacy-policy" className="text-sm text-background/70 hover:text-background transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-background/15 mt-10 pt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-background/55">© {year} LATIELLE MARKET HUB. All rights reserved.</p>
          <p className="text-xs text-background/55">Kenya's marketplace for established businesses.</p>
        </div>
      </div>
    </footer>
  );
}
