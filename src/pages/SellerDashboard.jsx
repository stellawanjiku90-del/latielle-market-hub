import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { getSession, redirectToLogin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, FileText, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import BuyerSellerChat from "../components/BuyerSellerChat";
import PullToRefreshWrapper from "../components/PullToRefreshWrapper";
import DashboardProfileHeader from "../components/DashboardProfileHeader";
import useUnreadCounts from "../hooks/useUnreadCounts";
import NotificationBell from "../components/NotificationBell";

const STATUS_COLORS = {
  draft: "secondary", pending: "outline", approved: "default", rejected: "destructive", suspended: "destructive", sold: "secondary"
};
const REQUEST_STATUS = {
  pending_payment: { label: "Awaiting Payment", variant: "secondary" },
  paid: { label: "Paid — Awaiting Your Decision", variant: "outline" },
  pending_approval: { label: "Awaiting Admin Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const identifier = user?.phone || user?.userId;
  const { unread, totalUnread } = useUnreadCounts(conversations, identifier);

  const loadData = useCallback(async (me) => {
    const resolvedUser = me || user;
    if (!resolvedUser) return;
    const identifier = resolvedUser.phone || resolvedUser.userId;
    const [l, r, c] = await Promise.all([
      api.entities.BusinessListing.filter({ created_by: identifier }, "-created_date", 50),
      api.entities.DetailRequest.filter({ seller_email: identifier }, "-created_date", 50),
      api.entities.Conversation.filter({ seller_email: identifier, type: "buyer_seller" }, "-last_message_at", 50),
    ]);
    setListings(l); setRequests(r); setConversations(c);
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const session = getSession();
      if (!session) { redirectToLogin("/seller-dashboard"); return; }
      setUser(session);
      await loadData(session);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    const identifier = user.phone || user.userId;
    const unsubRequests = api.entities.DetailRequest.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.seller_email !== identifier) return;
      setRequests(prev => {
        if (event.type === "delete") return prev.filter(r => r.id !== event.id);
        const exists = prev.some(r => r.id === event.id);
        if (exists) return prev.map(r => r.id === event.id ? rec : r);
        if (event.type === "create") return [rec, ...prev];
        return prev;
      });
    });
    const unsubListings = api.entities.BusinessListing.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.created_by !== identifier) return;
      setListings(prev => {
        if (event.type === "delete") return prev.filter(l => l.id !== event.id);
        const exists = prev.some(l => l.id === event.id);
        if (exists) return prev.map(l => l.id === event.id ? rec : l);
        if (event.type === "create") return [rec, ...prev];
        return prev;
      });
    });
    // Keep messages live and in sync (e.g. when a chat is opened on approval)
    const unsubConv = api.entities.Conversation.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.type !== "buyer_seller" || rec.seller_email !== identifier) return;
      setConversations(prev => {
        if (event.type === "delete") return prev.filter(c => c.id !== event.id);
        const exists = prev.some(c => c.id === event.id);
        if (exists) return prev.map(c => c.id === event.id ? rec : c);
        if (event.type === "create") return [rec, ...prev];
        return prev;
      });
    });
    return () => { unsubRequests(); unsubListings(); unsubConv(); };
  }, [user]);

  // Polling safety net — guarantees status changes (approved/rejected) appear within a few seconds
  useEffect(() => {
    if (!user) return;
    const identifier = user.phone || user.userId;
    const interval = setInterval(async () => {
      const r = await api.entities.DetailRequest.filter({ seller_email: identifier }, "-created_date", 50);
      setRequests(r);
    }, 4000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) return <div className="pt-24 flex justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PullToRefreshWrapper onRefresh={() => loadData()} className="pt-20 pb-16 min-h-screen bg-secondary/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between">
          <DashboardProfileHeader session={user} title="Seller Dashboard" />
          {identifier && <div className="pt-6"><NotificationBell recipient={identifier} /></div>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "My Listings", value: listings.length, icon: Store },
            { label: "Active Listings", value: listings.filter(l => l.status === "approved").length, icon: CheckCircle },
            { label: "Detail Requests", value: requests.length, icon: FileText },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><s.icon className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold font-heading">{s.value}</p><p className="text-xs text-muted-foreground font-body">{s.label}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="listings" className="font-body">
          <TabsList className="mb-4">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="requests">Buyer Requests</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />Messages
              {totalUnread > 0
                ? <Badge variant="destructive" className="h-4 px-1.5 text-[9px] ml-1">{totalUnread}</Badge>
                : conversations.length > 0 && <Badge className="h-4 px-1.5 text-[9px] ml-1">{conversations.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <div className="flex justify-end mb-3">
              <Link to="/create-listing"><Button className="font-body text-sm">+ New Listing</Button></Link>
            </div>
            {listings.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No listings yet.</p>
                <Link to="/create-listing"><Button>Create Your First Listing</Button></Link>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {listings.map(l => (
                  <Card key={l.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{l.title || `${l.category} — ${l.county}`}</h3>
                        <Badge variant={STATUS_COLORS[l.status] || "secondary"} className="text-[10px]">{l.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">KES {(l.asking_price || 0).toLocaleString()} · {l.category} · {l.listing_type}</p>
                    </div>
                    <Link to={`/listing/${l.id}`}><Button variant="outline" size="sm" className="text-xs">View</Button></Link>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {requests.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No buyer requests yet.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {requests.map(r => {
                  const statusInfo = REQUEST_STATUS[r.status] || REQUEST_STATUS.pending_payment;
                  return (
                    <Card key={r.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{r.listing_title || "Business"}</h3>
                          <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">From: {r.buyer_email}</p>
                        {r.message && <p className="text-xs text-muted-foreground mt-1 italic">"{r.message}"</p>}
                        {r.amount_paid && <p className="text-xs text-muted-foreground">KES {r.amount_paid.toLocaleString()} paid{r.mpesa_receipt ? ` · ${r.mpesa_receipt}` : ""}</p>}
                      </div>
                      {(r.status === "paid" || r.status === "pending_approval") && (
                        <p className="text-xs text-muted-foreground shrink-0 italic">Awaiting admin review</p>
                      )}
                      {r.status === "approved" && (
                        <p className="text-xs text-primary shrink-0 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Chat open</p>
                      )}
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
                <p className="text-muted-foreground text-sm">No active conversations yet. Approve a buyer request to open a chat.</p>
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
                          <p className="text-xs text-muted-foreground">With: {conv.buyer_email}</p>
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
                         currentUserName={user.name || "Seller"}
                         currentUserRole="seller"
                          listingTitle={conv.listing_title}
                          otherPartyEmail={conv.buyer_email}
                          onClose={() => setActiveConv(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefreshWrapper>
  );
}