import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getSession, redirectToLogin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, FileText, CheckCircle, Bell, MessageSquare } from "lucide-react";
import NotificationPreferences from "../components/NotificationPreferences";
import BuyerSellerChat from "../components/BuyerSellerChat";
import PullToRefreshWrapper from "../components/PullToRefreshWrapper";
import DashboardProfileHeader from "../components/DashboardProfileHeader";
import useUnreadCounts from "../hooks/useUnreadCounts";
import NotificationBell from "../components/NotificationBell";

const REQUEST_STATUS_MAP = {
  pending_payment: { label: "Pending Payment", variant: "secondary" },
  paid: { label: "Paid — Awaiting Seller", variant: "outline" },
  pending_approval: { label: "Awaiting Approval", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function BuyerDashboard() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const identifier = user?.phone || user?.userId;
  const { unread, totalUnread } = useUnreadCounts(conversations, identifier);

  const loadData = useCallback(async (me) => {
    const resolvedUser = me || user;
    if (!resolvedUser) return;
    const identifier = resolvedUser.phone || resolvedUser.userId;
    const [myRequests, convs] = await Promise.all([
      base44.entities.DetailRequest.filter({ buyer_email: identifier, payment_status: 'paid' }, "-created_date", 50),
      base44.entities.Conversation.filter({ buyer_email: identifier, type: "buyer_seller" }, "-last_message_at", 50),
    ]);
    setRequests(myRequests);
    setConversations(convs);
    if (resolvedUser.favorites?.length > 0) {
      const favListings = await Promise.all(
        resolvedUser.favorites.slice(0, 10).map(id => base44.entities.BusinessListing.get(id).catch(() => null))
      );
      setFavorites(favListings.filter(Boolean));
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const session = getSession();
      if (!session) { redirectToLogin("/buyer-dashboard"); return; }
      setUser(session);
      await loadData(session);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    const identifier = user.phone || user.userId;
    const unsubscribe = base44.entities.DetailRequest.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.buyer_email !== identifier) return;
      setRequests(prev => {
        if (event.type === "delete") return prev.filter(r => r.id !== event.id);
        const exists = prev.some(r => r.id === event.id);
        if (exists) return prev.map(r => r.id === event.id ? rec : r);
        if (event.type === "create" && rec.payment_status === "paid") return [rec, ...prev];
        return prev;
      });
    });
    // Listen for new buyer-seller chats opened when a seller approves a request
    const unsubConv = base44.entities.Conversation.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.type !== "buyer_seller" || rec.buyer_email !== identifier) return;
      setConversations(prev => {
        if (event.type === "delete") return prev.filter(c => c.id !== event.id);
        const exists = prev.some(c => c.id === event.id);
        if (exists) return prev.map(c => c.id === event.id ? rec : c);
        if (event.type === "create") return [rec, ...prev];
        return prev;
      });
    });
    return () => { unsubscribe(); unsubConv(); };
  }, [user]);

  // Polling safety net — guarantees status changes (approved/rejected) appear within a few seconds
  useEffect(() => {
    if (!user) return;
    const identifier = user.phone || user.userId;
    const interval = setInterval(async () => {
      const myRequests = await base44.entities.DetailRequest.filter({ buyer_email: identifier, payment_status: 'paid' }, "-created_date", 50);
      setRequests(myRequests);
    }, 4000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) return <div className="pt-24 flex justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PullToRefreshWrapper onRefresh={() => loadData()} className="pt-20 pb-16 min-h-screen bg-secondary/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between">
          <DashboardProfileHeader session={user} title="Buyer Dashboard" />
          {identifier && <div className="pt-6"><NotificationBell recipient={identifier} /></div>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "My Requests", value: requests.length, icon: FileText },
            { label: "Approved", value: requests.filter(r => r.status === "approved").length, icon: CheckCircle },
            { label: "Favorites", value: favorites.length, icon: Heart },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold font-heading">{s.value}</p><p className="text-xs text-muted-foreground font-body">{s.label}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="requests" className="font-body">
          <TabsList className="mb-4">
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />Messages
              {totalUnread > 0
                ? <Badge variant="destructive" className="h-4 px-1.5 text-[9px] ml-1">{totalUnread}</Badge>
                : conversations.length > 0 && <Badge className="h-4 px-1.5 text-[9px] ml-1">{conversations.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="favorites">Saved</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            {requests.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">You haven't requested any business details yet.</p>
                <Link to="/browse"><Button>Browse Businesses</Button></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {requests.map(r => {
                  const statusInfo = REQUEST_STATUS_MAP[r.status] || REQUEST_STATUS_MAP.pending_payment;
                  return (
                    <Card key={r.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{r.listing_title || "Business"}</h3>
                          <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {r.amount_paid ? `KES ${r.amount_paid.toLocaleString()} paid` : "Payment pending"}
                          {r.mpesa_receipt && ` · Receipt: ${r.mpesa_receipt}`}
                        </p>
                      </div>
                      <Link to={`/listing/${r.listing_id}`}><Button variant="outline" size="sm" className="text-xs">View Listing</Button></Link>
                    </CardContent></Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages">
            {conversations.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground text-sm">No active chats yet. Once a seller approves your detail request, a chat will open here.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {conversations.map(conv => (
                  <div key={conv.id}>
                    <Card
                      className="cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setActiveConv(activeConv?.id === conv.id ? null : conv)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm font-heading">{conv.listing_title || "Business Chat"}</p>
                            {unread[conv.id] > 0 && <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">{unread[conv.id]} new</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">Seller: {conv.seller_email}</p>
                          {conv.last_message && <p className={`text-xs mt-0.5 italic truncate max-w-xs ${unread[conv.id] > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>"{conv.last_message}"</p>}
                        </div>
                        <MessageSquare className={`h-4 w-4 ${unread[conv.id] > 0 ? "text-destructive" : "text-primary"}`} />
                      </CardContent>
                    </Card>
                    {activeConv?.id === conv.id && user && (
                      <div className="mt-2">
                        <BuyerSellerChat
                          conversationId={conv.id}
                          currentUserEmail={user.phone || user.userId}
                          currentUserName={user.name || "Buyer"}
                          currentUserRole="buyer"
                          listingTitle={conv.listing_title}
                          otherPartyEmail={conv.seller_email}
                          onClose={() => setActiveConv(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favorites.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No saved businesses yet.</p>
                <Link to="/browse"><Button>Browse Businesses</Button></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {favorites.map(l => (
                  <Card key={l.id}><CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{l.title || `${l.category} — ${l.county}`}</h3>
                      <p className="text-xs text-muted-foreground">KES {(l.asking_price || 0).toLocaleString()} · {l.category}</p>
                    </div>
                    <Link to={`/listing/${l.id}`}><Button variant="outline" size="sm" className="text-xs">View</Button></Link>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <NotificationPreferences user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefreshWrapper>
  );
}