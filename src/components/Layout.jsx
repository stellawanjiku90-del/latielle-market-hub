import { Outlet, useLocation } from "react-router-dom";
import GlobalHeader from "./GlobalHeader";
import Footer from "./Footer";
import HelpChatWidget from "./HelpChatWidget";
import MobileBottomNav from "./MobileBottomNav";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-body overflow-x-hidden">
      <GlobalHeader />
      <main className="flex-1 page-transition" key={location.pathname}>
        <Outlet />
      </main>
      <Footer />
      <HelpChatWidget />
      <MobileBottomNav />
    </div>
  );
}