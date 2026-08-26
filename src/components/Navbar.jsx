import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield, User, LogOut, LayoutDashboard, UserCircle, ShoppingBag, Store, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { label: "Browse", path: "/browse" },
  { label: "Sold", path: "/sold-businesses" },
  { label: "How It Works", path: "/how-it-works" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-navy text-white transition-shadow duration-300 ${scrolled ? "shadow-md" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="font-heading text-xl font-bold text-white">LATIELLE MARKET HUB</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-body font-medium transition-colors ${location.pathname === link.path ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-body border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                    <User className="h-4 w-4" />
                    {user.full_name || "Account"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-body">
                  <DropdownMenuItem onSelect={() => navigate("/buyer-dashboard")} className="gap-2 cursor-pointer"><ShoppingBag className="h-4 w-4" />Buyer Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate("/seller-dashboard")} className="gap-2 cursor-pointer"><Store className="h-4 w-4" />Seller Dashboard</DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => navigate("/admin")} className="gap-2 cursor-pointer"><Settings className="h-4 w-4" />Admin Dashboard</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => navigate("/profile")} className="gap-2 cursor-pointer"><UserCircle className="h-4 w-4" />My Profile</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => logout()} className="gap-2 text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="font-body text-white hover:bg-white/10 hover:text-white" asChild><Link to="/login">Sign In</Link></Button>
                <Button size="sm" className="font-body" asChild><Link to="/login">Get Started</Link></Button>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 font-body">
              <div className="flex flex-col gap-6 mt-8">
                {NAV_LINKS.map((link) => (
                  <Link key={link.path} to={link.path} onClick={() => setOpen(false)} className="text-lg font-medium">{link.label}</Link>
                ))}
                <hr className="border-border" />
                {user ? (
                  <>
                    <Link to="/buyer-dashboard" onClick={() => setOpen(false)} className="text-lg font-medium">Buyer Dashboard</Link>
                    <Link to="/seller-dashboard" onClick={() => setOpen(false)} className="text-lg font-medium">Seller Dashboard</Link>
                    {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="text-lg font-medium">Admin Dashboard</Link>}
                    <Link to="/profile" onClick={() => setOpen(false)} className="text-lg font-medium">My Profile</Link>
                    <button onClick={() => { logout(); setOpen(false); }} className="text-lg font-medium text-destructive text-left">Sign Out</button>
                  </>
                ) : (
                  <Button className="w-full" asChild><Link to="/login" onClick={() => setOpen(false)}>Get Started</Link></Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}