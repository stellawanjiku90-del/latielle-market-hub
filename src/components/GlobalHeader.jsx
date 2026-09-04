import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Shield, User, LogOut, LayoutDashboard, ArrowLeft } from "lucide-react";

const NAV_LINKS = [
  { label: "Browse", path: "/browse" },
  { label: "Sold", path: "/sold-businesses" },
  { label: "How It Works", path: "/how-it-works" },
];

// These paths are "root" screens — show logo. All others show back button on mobile.
const ROOT_PATHS = ["/", "/browse", "/seller-dashboard", "/buyer-dashboard", "/admin"];

export default function GlobalHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isRoot = ROOT_PATHS.includes(location.pathname);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const getDashboardPath = () => {
    if (!user) return "/";
    if (user.role === "admin") return "/admin";
    if (user.role === "seller") return "/seller-dashboard";
    return "/buyer-dashboard";
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-navy text-white transition-shadow duration-300 ${scrolled ? "shadow-md" : ""}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: back button on mobile child screens, logo always on desktop */}
          <div className="flex items-center gap-2">
            {!isRoot && (
              <button
                onClick={() => navigate(-1)}
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-white/10 transition-colors select-none mr-1"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}
            <Link to={user ? getDashboardPath() : "/"} className="flex items-center gap-2 select-none">
              <Shield className="h-7 w-7 text-primary" />
              <span className="font-heading text-xl font-bold text-white hidden sm:inline">LATIELLE MARKET HUB</span>
              <span className="font-heading text-base font-bold text-white sm:hidden">LATIELLE</span>
            </Link>
          </div>

          {/* Center: desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-body font-medium transition-colors select-none ${location.pathname === link.path ? "text-white font-semibold" : "text-white/90 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: user actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 font-body select-none border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white">
                      <User className="h-4 w-4" />
                      {user.full_name || user.name || "Account"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="font-body">
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardPath()} className="gap-2 select-none"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} className="gap-2 text-destructive select-none">
                      <LogOut className="h-4 w-4" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="font-body select-none text-white hover:bg-white/10 hover:text-white" asChild><Link to="/login">Sign In</Link></Button>
                  <Button size="sm" className="font-body select-none" asChild><Link to="/login">Get Started</Link></Button>
                </>
              )}
            </div>

            {/* Mobile hamburger — only on root screens */}
            {isRoot && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="select-none text-white hover:bg-white/10"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 font-body">
                  <div className="flex flex-col gap-6 mt-8">
                    {NAV_LINKS.map((link) => (
                      <Link key={link.path} to={link.path} onClick={() => setOpen(false)} className="text-lg font-medium select-none">{link.label}</Link>
                    ))}
                    <hr className="border-border" />
                    {user ? (
                      <>
                        <Link to={getDashboardPath()} onClick={() => setOpen(false)} className="text-lg font-medium select-none">Dashboard</Link>
                        <button onClick={() => { logout(); setOpen(false); }} className="text-lg font-medium text-destructive text-left select-none">Sign Out</button>
                      </>
                    ) : (
                      <Button className="w-full select-none" asChild><Link to="/login" onClick={() => setOpen(false)}>Get Started</Link></Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}