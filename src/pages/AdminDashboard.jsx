import { useState, useEffect } from "react";
import { api, apiFunction } from "@/api/apiClient";
import { getSession, redirectToLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Users, Store, CreditCard, Flag, CheckCircle, XCircle, Clock, BadgeCheck, MessageSquare, ChevronDown, ChevronUp, FileText, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import ViewCount from "../components/ViewCount";
import BuyerSellerChat from "../components/BuyerSellerChat";
import ListingReviewModal from "../components/admin/ListingReviewModal";
import BuyerRequestReviewModal from "../components/admin/BuyerRequestReviewModal";

const REQUEST_STATUS = {
  pending_payment: { label: "Pending Payment", variant: "outline" },
  paid: { label: "Pending Review", variant: "outline" },
  pending_approval: { label: "Pending Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  responded: { label: "Responded", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [expandedConv, setExpandedConv] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});
  const [detailRequests, setDetailRequests] = useState([]);
  const [reviewListing, setReviewListing] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [sortByViews, setSortByViews] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const session = getSession();
      if (!session) { redirectToLogin("/admin"); return; }
      if (session.role !== "admin") { window.location.href = "/"; return; }
      setUser(session);
      const [u, l, t, r, c, s, dr] = await Promise.all([
        api.entities.PhoneUser.list("-created_date", 200),
        api.entities.BusinessListing.list("-created_date", 50),
        api.entities.Transaction.list("-created_date", 50),
        api.entities.Report.list("-created_date", 50),
        api.entities.Conversation.list("-last_message_at", 100),
        api.entities.SupportRequest.list("-created_date", 100),
        api.entities.DetailRequest.list("-created_date", 100),
      ]);
      setUsers(u); setListings(l); setTransactions(t); setReports(r); setConversations(c); setSupportRequests(s);
      // Only show requests where the buyer has actually paid (not abandoned/unpaid)
      setDetailRequests(dr.filter(d => d.status !== "pending_payment"));
      setLoading(false);
    };
    init();
  }, []);

  const saveAdminNote = async (convId) => {
    const note = adminNotes[convId];
    if (!note?.trim()) return;
    await api.entities.Conversation.update(convId, { admin_note: note });
    toast.success("Note saved");
  };

  const handleApprove = (id) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: "approved" } : l));
    setReviewListing(null);
    toast.success("Listing approved");
    api.entities.BusinessListing.update(id, { status: "approved", admin_notes: "" }).catch(() => {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "pending" } : l));
      toast.error("Action failed. Please try again.");
    });
  };

  const handleReject = (id, reason) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: "rejected", admin_notes: reason } : l));
    setReviewListing(null);
    toast.success("Listing rejected");
    api.entities.BusinessListing.update(id, { status: "rejected", admin_notes: reason }).catch(() => {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "pending" } : l));
      toast.error("Action failed. Please try again.");
    });
  };

  const handleApproveRequest = async (id) => {
    const req = detailRequests.find(d => d.id === id);
    if (!req) return;
    setDetailRequests(prev => prev.map(d => d.id === id ? { ...d, status: "approved" } : d));
    setReviewRequest(null);
    try {
      await api.entities.DetailRequest.update(id, { status: "approved", responded_at: new Date().toISOString() });

      // Create the buyer-seller conversation (only if one doesn't already exist)
      const existing = await api.entities.Conversation.filter({ detail_request_id: id, type: "buyer_seller" }, "-created_date", 1);
      let conv = existing[0];
      if (!conv) {
        conv = await api.entities.Conversation.create({
          type: "buyer_seller",
          buyer_email: req.buyer_email,
          seller_email: req.seller_email,
          listing_id: req.listing_id,
          listing_title: req.listing_title,
          detail_request_id: id,
          status: "active",
        });
        setConversations(prev => [conv, ...prev]);
      }

      // Notify both seller and buyer in-app
      apiFunction('createNotification', {
        recipient: req.seller_email,
        type: "chat_opened",
        title: "New buyer connected",
        body: `A buyer's request for "${req.listing_title || "your business"}" was approved. You can now chat with them.`,
        conversationId: conv.id,
      }).catch(() => {});
      apiFunction('createNotification', {
        recipient: req.buyer_email,
        type: "chat_opened",
        title: "Request approved",
        body: `You can now chat directly with the seller about "${req.listing_title || "the business"}".`,
        conversationId: conv.id,
      }).catch(() => {});

      toast.success("Approved — conversation opened between buyer and seller");
    } catch {
      setDetailRequests(prev => prev.map(d => d.id === id ? { ...d, status: req.status } : d));
      toast.error("Failed to approve. Please try again.");
    }
  };

  const handleRejectBuyerRequest = async (id, reason) => {
    const req = detailRequests.find(d => d.id === id);
    const entry = { type: "rejection", content: reason, sent_at: new Date().toISOString() };
    const history = [...(req?.response_history || []), entry];
    setDetailRequests(prev => prev.map(d => d.id === id ? { ...d, status: "rejected", rejection_reason: reason, response_history: history } : d));
    setReviewRequest(null);
    try {
      await api.entities.DetailRequest.update(id, { status: "rejected", rejection_reason: reason, response_history: history });
      await apiFunction('notifyBuyerResponse', { buyerEmail: req?.buyer_email, listingTitle: req?.listing_title, content: reason, type: "rejection" });
      toast.success("Request rejected and buyer notified");
    } catch {
      toast.error("Failed to reject. Please try again.");
    }
  };

  const handleToggleVerified = (id, current) => {
    const is_verified = !current;
    // Optimistic update immediately
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_verified } : l));
    toast.success(is_verified ? "Listing marked as Verified ✅" : "Verification removed");
    api.entities.BusinessListing.update(id, { is_verified }).catch(() => {
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_verified: current } : l));
      toast.error("Action failed. Please try again.");
    });
  };

  const handleUserVerification = (id, verification_status) => {
    const prev_status = users.find(u => u.id === id)?.verification_status;
    // Optimistic update immediately
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verification_status } : u));
    toast.success(`User ${verification_status}`);
    api.entities.User.update(id, { verification_status }).catch(() => {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, verification_status: prev_status } : u));
      toast.error("Action failed. Please try again.");
    });
  };

  if (loading) return <div className="pt-24 flex justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const pendingListings = listings.filter(l => l.status === "pending").length;
  const pendingRequests = detailRequests.filter(d => d.status === "paid" || d.status === "pending_approval").length;
  const pendingUsers = 0;
  const totalRevenue = transactions.filter(t => t.status === "successful").reduce((sum, t) => sum + (t.amount || 0), 0);
  const salesRevenue = listings.filter(l => l.status === "sold").reduce((sum, l) => sum + (l.sold_price || 0), 0);

  return (
    <div className="pt-20 pb-16 min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">Manage users, listings, payments, and reports</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Users", value: users.length, icon: Users },
            { label: "Pending Listings", value: pendingListings, icon: Clock },
            { label: "Service Fees (KES)", value: totalRevenue.toLocaleString(), icon: CreditCard },
            { label: "Sales Revenue (KES)", value: salesRevenue.toLocaleString(), icon: Store },
            { label: "Open Reports", value: reports.filter(r => r.status === "open").length, icon: Flag },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><s.icon className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xl font-bold font-heading">{s.value}</p><p className="text-xs text-muted-foreground font-body">{s.label}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="listings" className="font-body">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="listings">Listings{pendingListings > 0 && ` (${pendingListings})`}</TabsTrigger>
            <TabsTrigger value="requests" className="gap-1"><FileText className="h-3.5 w-3.5" />Buyer Requests{pendingRequests > 0 && ` (${pendingRequests})`}</TabsTrigger>
            <TabsTrigger value="users">Users{pendingUsers > 0 && ` (${pendingUsers})`}</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1"><MessageSquare className="h-3.5 w-3.5" />Conversations{conversations.length > 0 && ` (${conversations.length})`}</TabsTrigger>
            <TabsTrigger value="support" className="gap-1"><Flag className="h-3.5 w-3.5" />Support{supportRequests.filter(s => s.status === "open").length > 0 && ` (${supportRequests.filter(s => s.status === "open").length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <div className="flex justify-end mb-3">
              <Button size="sm" variant={sortByViews ? "default" : "outline"} className="text-xs gap-1.5" onClick={() => setSortByViews(v => !v)}>
                <Eye className="h-3.5 w-3.5" />{sortByViews ? "Sorted by Most Viewed" : "Sort by Most Viewed"}
              </Button>
            </div>
            <div className="space-y-3">
              {listings.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No listings yet.</p> : (sortByViews ? [...listings].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)) : listings).map(l => (
                <Card key={l.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{l.title || `${l.category} - ${l.county}`}</h3>
                      <Badge variant={l.status === "approved" ? "default" : l.status === "pending" ? "outline" : l.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] shrink-0">{l.status === "pending" ? "Pending Review" : l.status === "approved" ? "Approved" : l.status === "rejected" ? "Rejected" : l.status}</Badge>
                      <ViewCount count={l.views_count} className="shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">KES {(l.asking_price || 0).toLocaleString()} · by {l.created_by} · {l.listing_type}</p>
                    {l.status === "rejected" && l.admin_notes && (
                      <p className="text-xs text-destructive mt-1">Rejection reason: {l.admin_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={l.is_verified ? "default" : "outline"}
                      className={`text-xs gap-1 ${l.is_verified ? "bg-emerald-600 hover:bg-emerald-700" : "text-muted-foreground"}`}
                      onClick={() => handleToggleVerified(l.id, l.is_verified)}
                    >
                      <BadgeCheck className="h-3 w-3" />{l.is_verified ? "Verified" : "Mark Verified"}
                    </Button>
                  {l.status === "pending" && (
                    <Button size="sm" className="text-xs gap-1 shrink-0" onClick={() => setReviewListing(l)}><FileText className="h-3 w-3" />Review</Button>
                  )}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <p className="text-xs text-muted-foreground mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              📩 Review each request and approve it to open a secure chat between the buyer and seller. Buyer and seller then communicate directly.
            </p>
            <div className="space-y-3">
              {detailRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No buyer requests yet.</p>
              ) : detailRequests.map(d => {
                const st = REQUEST_STATUS[d.status] || { label: d.status, variant: "outline" };
                return (
                  <Card key={d.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{d.listing_title || "Business Listing"}</h3>
                        <Badge variant={st.variant} className="text-[10px] shrink-0">{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Buyer: {d.buyer_email}{d.mpesa_receipt ? ` · Receipt: ${d.mpesa_receipt}` : ""}
                        {d.created_date ? ` · ${new Date(d.created_date).toLocaleDateString()}` : ""}
                      </p>
                      {d.status === "approved" && (
                        <p className="text-xs text-primary mt-1 line-clamp-1">Approved — buyer & seller chat is open</p>
                      )}
                      {d.status === "rejected" && d.rejection_reason && (
                        <p className="text-xs text-destructive mt-1 line-clamp-1">Rejected: {d.rejection_reason}</p>
                      )}
                    </div>
                    <Button size="sm" className="text-xs gap-1 shrink-0" onClick={() => setReviewRequest(d)}>
                      {d.status === "approved" || d.status === "rejected" ? <FileText className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                      {d.status === "approved" || d.status === "rejected" ? "View Details" : "Review & Approve"}
                    </Button>
                  </CardContent></Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-3">
              {users.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No registered users yet.</p> : users.map(u => (
                <Card key={u.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                      {u.profile_picture ? <img src={u.profile_picture} alt="" className="h-full w-full object-cover" /> : <Users className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{u.full_name || u.phone_number}</h3>
                        <Badge variant="secondary" className="text-[10px]">{u.role || "buyer"}</Badge>
                        <Badge variant={u.is_verified ? "default" : "outline"} className="text-[10px]">{u.is_verified ? "verified" : "unverified"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.phone_number} · {u.county || "—"}{u.subcounty ? ` (${u.subcounty})` : ""}
                        {u.created_date ? ` · joined ${new Date(u.created_date).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="space-y-3">
              {transactions.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet.</p> : transactions.map(t => (
                <Card key={t.id}><CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">KES {(t.amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t.user_email} · {t.service_type} · {t.mpesa_receipt || "—"}</p>
                  </div>
                  <Badge variant={t.status === "successful" ? "default" : t.status === "failed" ? "destructive" : "outline"} className="text-[10px]">{t.status}</Badge>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-3">
              {reports.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No reports.</p> : reports.map(r => (
                <Card key={r.id}><CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" className="text-[10px]">{r.reason}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">By: {r.reporter_email || r.created_by}</p>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="conversations">
            <p className="text-xs text-muted-foreground mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              🔒 <strong>Admin view only.</strong> You can read all conversations and leave private notes. Users are not notified of your access.
            </p>
            {/* Support chat requests highlight */}
            {conversations.filter(c => c.type === "support").length > 0 && (
              <div className="mb-4 bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {conversations.filter(c => c.type === "support").length} Direct Support Request(s) — Users want to chat with you
                </p>
                <div className="space-y-1.5">
                  {conversations.filter(c => c.type === "support").map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2 text-xs border border-border/50">
                      <span className="font-medium">{c.buyer_email}</span>
                      <Button size="sm" className="h-7 text-xs gap-1 py-0" onClick={() => setExpandedConv(expandedConv === c.id ? null : c.id)}>
                        <MessageSquare className="h-3 w-3" /> Open Chat
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No conversations yet.</p>
            ) : (
              <div className="space-y-3">
                {conversations.map(conv => (
                  <Card key={conv.id}>
                    <CardContent className="p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedConv(expandedConv === conv.id ? null : conv.id)}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm">{conv.listing_title || "Conversation"}</p>
                            <Badge variant={conv.type === "support" ? "secondary" : "outline"} className="text-[10px]">{conv.type}</Badge>
                            <Badge variant={conv.status === "active" ? "default" : "secondary"} className="text-[10px]">{conv.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {conv.buyer_email && `Buyer: ${conv.buyer_email}`}
                            {conv.seller_email && ` · Seller: ${conv.seller_email}`}
                          </p>
                          {conv.last_message && <p className="text-xs text-muted-foreground italic mt-0.5">"{conv.last_message}"</p>}
                        </div>
                        {expandedConv === conv.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>

                      {expandedConv === conv.id && (
                        <div className="mt-4 space-y-3">
                          <BuyerSellerChat
                            conversationId={conv.id}
                            currentUserEmail={user?.phone || user?.userId}
                            currentUserName={"Admin"}
                            currentUserRole="admin"
                            listingTitle={conv.listing_title}
                          />
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Private Admin Note (not visible to users)</p>
                            <Textarea
                              rows={2}
                              placeholder="Add a private note about this conversation..."
                              value={adminNotes[conv.id] ?? (conv.admin_note || "")}
                              onChange={e => setAdminNotes(prev => ({ ...prev, [conv.id]: e.target.value }))}
                            />
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => saveAdminNote(conv.id)}>Save Note</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="support">
            <div className="space-y-3">
              {supportRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No support requests yet.</p>
              ) : supportRequests.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm truncate">{s.user_name || s.user_email || "Anonymous"}</p>
                          <Badge variant={s.type === "human_request" ? "default" : "secondary"} className="text-[10px]">
                            {s.type === "human_request" ? "Human Request" : "AI Chat"}
                          </Badge>
                          <Badge variant={s.status === "open" ? "destructive" : s.status === "in_progress" ? "outline" : "secondary"} className="text-[10px]">{s.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{s.user_email}</p>
                        <p className="text-sm text-foreground">{s.message}</p>
                        {s.conversation_summary && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Chat: {s.conversation_summary.slice(0, 120)}{s.conversation_summary.length > 120 ? "…" : ""}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(s.created_date).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {s.status === "open" && (
                          <Button size="sm" className="text-xs" onClick={() => {
                            api.entities.SupportRequest.update(s.id, { status: "in_progress" });
                            setSupportRequests(prev => prev.map(r => r.id === s.id ? { ...r, status: "in_progress" } : r));
                          }}>In Progress</Button>
                        )}
                        {s.status !== "resolved" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                            api.entities.SupportRequest.update(s.id, { status: "resolved" });
                            setSupportRequests(prev => prev.map(r => r.id === s.id ? { ...r, status: "resolved" } : r));
                          }}>Resolve</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ListingReviewModal
        open={!!reviewListing}
        onOpenChange={(v) => !v && setReviewListing(null)}
        listing={reviewListing}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <BuyerRequestReviewModal
        open={!!reviewRequest}
        onOpenChange={(v) => !v && setReviewRequest(null)}
        request={reviewRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectBuyerRequest}
      />
    </div>
  );
}