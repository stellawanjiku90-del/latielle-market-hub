import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { saveReturnUrl } from "@/lib/auth";
import { Home, Search, LayoutDashboard, MessageSquare } from "lucide-react";

/**
 * Each tab keeps its own history stack so switching tabs
 * restores where you left off on that tab.
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Per-tab last-visited path
  const tabHistory = useRef({
    home: "/",
    browse: "/browse",
    dashboard: "/buyer-dashboard",
    messages: "/buyer-dashboard",
  });

  useEffect(() => {
    if (user) {
      const dash = user.role === "admin" ? "/admin" : user.role === "seller" ? "/seller-dashboard" : "/buyer-dashboard";
      tabHistory.current.dashboard = dash;
      tabHistory.current.messages = dash;
    }
  }, [user]);

  // Track which path each tab owns
  const TAB_ROOTS = {
    home: ["/", "/how-it-works", "/sold-businesses", "/terms", "/privacy-policy", "/refund-policy"],
    browse: ["/browse", "/listing/"],
    dashboard: ["/admin", "/seller-dashboard", "/buyer-dashboard", "/create-listing"],
    messages: [],
  };

  const getActiveTab = () => {
    const p = location.pathname;
    if (TAB_ROOTS.browse.some(r => p.startsWith(r))) return "browse";
    if (TAB_ROOTS.dashboard.some(r => p.startsWith(r))) return "dashboard";
    return "home";
  };

  const activeTab = getActiveTab();

  // Save current path for this tab whenever location changes
  useEffect(() => {
    const p = location.pathname;
    if (TAB_ROOTS.browse.some(r => p.startsWith(r))) tabHistory.current.browse = p;
    else if (TAB_ROOTS.dashboard.some(r => p.startsWith(r))) {
      tabHistory.current.dashboard = p;
      tabHistory.current.messages = p;
    } else {
      tabHistory.current.home = p;
    }
  }, [location.pathname]);

  const handleTabPress = (tabKey, defaultPath) => {
    // Dashboard/messages require auth
    if ((tabKey === "dashboard" || tabKey === "messages") && !user) {
      saveReturnUrl(tabHistory.current[tabKey] || defaultPath);
      navigate("/login");
      return;
    }
    const dest = tabHistory.current[tabKey] || defaultPath;
    if (location.pathname === dest) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(dest);
  };

  const homeDefault = user ? (user.role === "admin" ? "/admin" : user.role === "seller" ? "/seller-dashboard" : "/buyer-dashboard") : "/";
  const tabs = user ? [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, default: tabHistory.current.dashboard },
    { key: "browse", label: "Browse", icon: Search, default: "/browse" },
    { key: "messages", label: "Messages", icon: MessageSquare, default: tabHistory.current.messages },
    { key: "home", label: "Home", icon: Home, default: homeDefault },
  ] : [
    { key: "home", label: "Home", icon: Home, default: "/" },
    { key: "browse", label: "Browse", icon: Search, default: "/browse" },
    { key: "messages", label: "Sign in", icon: MessageSquare, default: "/login" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key || (tab.key === "messages" && activeTab === "dashboard");
          const isStrictActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabPress(tab.key, tab.default)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 select-none transition-colors relative active:scale-95 ${
                isStrictActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform ${isStrictActive ? "scale-110" : ""}`} />
              <span className={`text-[10px] font-body font-medium`}>{tab.label}</span>
              {isStrictActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}