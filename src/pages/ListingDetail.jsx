import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, apiFunction } from "@/api/apiClient";
import { getSession, redirectToLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Clock, Users, TrendingUp, Lock, ShieldCheck, Flag, DollarSign, FileText, Phone, Loader2, CheckCircle2, XCircle } from "lucide-react";
import VerificationBadge from "../components/VerificationBadge";
import WatermarkedMedia from "../components/WatermarkedMedia";
import ViewCount from "../components/ViewCount";
import { trackListingView } from "@/lib/trackView";
import { toast } from "sonner";

function formatPrice(price) {
  if (!price) return "Price on request";
  return `KES ${price.toLocaleString()}`;
}

const categoryImages = {
  "Restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=500&fit=crop",
  "Salon": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=500&fit=crop",
  "Hotel": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop",
  "Pharmacy": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=500&fit=crop",
  "Supermarket": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=500&fit=crop",
  "Gym": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=500&fit=crop",
  "Café": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=500&fit=crop",
};

export default function ListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  const CONFIDENTIAL_ITEMS = [
    "Exact business location (GPS map pin & address)",
    "Seller's direct phone number",
    "Financial documents (bank statements, receipts)",
    "Business licence & registration certificate",
    "Supplier information & contacts",
    "Staff details & salary structure",
    "Lease / tenancy agreement documents",
  ];

  const toggleItem = (item) => {
    setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };
  const [requesting, setRequesting] = useState(false);
  // payment state: idle | processing | success | failed | timeout
  const [payState, setPayState] = useState("idle");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    api.entities.BusinessListing.get(listingId).then(async (data) => {
      setListing(data);
      const newCount = await trackListingView(listingId, data?.views_count);
      if (newCount != null) setListing(prev => prev ? { ...prev, views_count: newCount } : prev);
    }).catch(() => {}).finally(() => setLoading(false));
    const session = getSession();
    setUser(session);
    if (session?.phone) setPaymentPhone(session.phone);
  }, [listingId]);

  const redirectToLoginWithReturn = () => {
    redirectToLogin(window.location.pathname);
  };

  const handleReport = async () => {
    if (!user) { redirectToLoginWithReturn(); return; }
    if (!reportReason || !reportDetails.trim()) { toast.error("Please select a reason and provide details."); return; }
    setReporting(true);
    await api.entities.Report.create({
      reporter_email: user.phone || user.userId,
      listing_id: listingId,
      reported_user_email: listing.created_by,
      reason: reportReason,
      details: reportDetails,
      status: "open",
    });
    toast.success("Report submitted. Our team will review it shortly.");
    setReportOpen(false);
    setReportReason("");
    setReportDetails("");
    setReporting(false);
  };

  const handleRequestDetails = async () => {
    if (!user) { redirectToLoginWithReturn(); return; }
    if (selectedItems.length === 0) { toast.error("Please select at least one item to request."); return; }
    setRequesting(true);
    const itemsList = selectedItems.map(i => `- ${i}`).join("\n");
    const fullMessage = `Requested items:\n${itemsList}${requestMessage.trim() ? `\n\nAdditional notes:\n${requestMessage}` : ""}`;

    // Payments temporarily disabled — submit directly for admin verification (free).
    let result = null;
    try {
      const res = await apiFunction('submitDetailRequest', {
        listingId,
        buyerEmail: user.phone || user.userId,
        sellerEmail: listing.created_by,
        listingTitle: listing.title || listing.category,
        message: fullMessage,
      });
      result = res.data;
    } catch (e) {
      toast.error("Something went wrong. Please try again or contact support.");
      setRequesting(false);
      return;
    }

    if (result?.success) {
      setPayState("success");
      toast.success("Submitted! Your request is now awaiting admin approval.");
      setTimeout(() => {
        const role = user?.role;
        const dash = role === "admin" ? "/admin" : role === "seller" ? "/seller-dashboard" : "/buyer-dashboard";
        navigate(dash);
      }, 1200);
    } else {
      toast.error(result?.error || "Failed to submit your request. Please try again.");
    }
    setRequesting(false);
  };

  if (loading) return (
    <div className="pt-24 pb-16 max-w-4xl mx-auto px-4">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-80 bg-muted rounded-xl" />
        <div className="h-6 w-64 bg-muted rounded" />
      </div>
    </div>
  );

  if (!listing) return (
    <div className="pt-24 pb-16 text-center">
      <p className="text-muted-foreground font-body">Listing not found.</p>
      <Link to="/browse"><Button variant="outline" className="mt-4 font-body">Back to Browse</Button></Link>
    </div>
  );

  const mainImg = listing.photos?.[0] || categoryImages[listing.category] || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop";

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to listings
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl overflow-hidden aspect-[16/10]">
              <WatermarkedMedia src={mainImg} alt={listing.title || listing.category} className="w-full h-full object-cover" />
            </div>
            {listing.photos?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {listing.photos.slice(1).map((p, i) => (
                  <div key={i} className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-border">
                    <WatermarkedMedia src={p} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {listing.videos?.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-base font-semibold">Business Videos</h2>
                {listing.videos.map((v, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-border">
                    <WatermarkedMedia src={v} type="video" controls className="w-full" />
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="font-body">{listing.category}</Badge>
                {listing.listing_type === "premium" && <VerificationBadge type="premium" />}
                {listing.is_verified && <VerificationBadge type="business_verified" />}
                <VerificationBadge type="verified_seller" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{listing.title || `${listing.category} for Sale`}</h1>
                <ViewCount count={listing.views_count} className="shrink-0 mt-1.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: MapPin, label: "Location", value: listing.county },
                { icon: Clock, label: "Operating", value: listing.years_operating ? `${listing.years_operating} years` : "—" },
                { icon: Users, label: "Employees", value: listing.employees || "—" },
                { icon: TrendingUp, label: "Gross Sales", value: listing.monthly_gross_sales || "—" },
              ].map(item => (
                <div key={item.label} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body mb-1">
                    <item.icon className="h-3 w-3" />{item.label}
                  </div>
                  <p className="text-sm font-semibold text-foreground font-body">{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h2 className="font-heading text-lg font-semibold mb-3">About This Business</h2>
              <p className="text-muted-foreground font-body leading-relaxed text-sm whitespace-pre-line">{listing.description}</p>
            </div>

            {(listing.monthly_gross_sales || listing.monthly_net_sales || listing.financial_records_available) && (
              <div className="bg-secondary/30 rounded-xl p-5 border border-border/50">
                <h2 className="font-heading text-base font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />Financial Overview
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm font-body">
                  {listing.monthly_gross_sales && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Monthly Gross Sales</p>
                      <p className="font-bold text-foreground">{listing.monthly_gross_sales}</p>
                    </div>
                  )}
                  {listing.monthly_net_sales && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Monthly Net Profit</p>
                      <p className="font-bold text-primary">{listing.monthly_net_sales}</p>
                    </div>
                  )}
                </div>
                {listing.financial_records_available && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-0.5">Financial Records</p>
                    <p className="text-sm font-medium">{{
                      yes_full: "✅ Full records available",
                      yes_partial: "⚠️ Partial records available",
                      upon_request: "📋 Available upon request",
                      no: "❌ No records available",
                    }[listing.financial_records_available]}</p>
                  </div>
                )}
              </div>
            )}

            {listing.reason_for_selling && (
              <div>
                <h2 className="font-heading text-lg font-semibold mb-2">Reason for Selling</h2>
                <p className="text-sm text-muted-foreground font-body">{listing.reason_for_selling}</p>
              </div>
            )}

            {/* Confidential Section */}
            <div className="relative bg-secondary/30 rounded-xl p-6 border border-border/50">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
                <Lock className="h-8 w-8 text-primary mb-3" />
                <p className="font-heading text-lg font-semibold text-foreground">Confidential Information</p>
                <p className="text-sm text-muted-foreground font-body mt-1 text-center max-w-sm">
                  Exact location, financial documents, supplier details, and seller contact are protected.
                </p>
                {!user ? (
                  <Button className="mt-4 font-body gap-2" onClick={redirectToLoginWithReturn}>
                    <FileText className="h-4 w-4" />Get Started — Sign In to Request Details
                  </Button>
                ) : null}
                <Dialog>
                  <DialogTrigger asChild>
                    {user ? (
                      <Button className="mt-4 font-body gap-2">
                        <FileText className="h-4 w-4" />Request Business Details
                      </Button>
                    ) : <span />}
                  </DialogTrigger>
                  <DialogContent className="font-body">
                    <DialogHeader><DialogTitle className="font-heading">Request Confidential Details</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground mb-3">Select the information you'd like to request from the seller:</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                        <Checkbox
                          id="select-all"
                          checked={selectedItems.length === CONFIDENTIAL_ITEMS.length}
                          onCheckedChange={(checked) => setSelectedItems(checked ? [...CONFIDENTIAL_ITEMS] : [])}
                        />
                        <label htmlFor="select-all" className="text-xs font-semibold cursor-pointer select-none">Select All</label>
                      </div>
                      {CONFIDENTIAL_ITEMS.map(item => (
                        <div key={item} className="flex items-start gap-2">
                          <Checkbox
                            id={item}
                            checked={selectedItems.includes(item)}
                            onCheckedChange={() => toggleItem(item)}
                            className="mt-0.5"
                          />
                          <label htmlFor={item} className="text-sm text-muted-foreground cursor-pointer select-none leading-snug">{item}</label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted border border-border rounded-lg px-3 py-2 mt-3">
                      ⚠️ The seller retains the right to decline sharing any information at their discretion.
                    </p>
                    <div className="mt-3">
                      <span className="text-xs text-muted-foreground">Additional notes (optional)</span>
                      <Textarea className="mt-1" placeholder="Any additional message to the seller..." value={requestMessage} onChange={e => setRequestMessage(e.target.value)} rows={2} />
                    </div>
                    {payState === "success" ? (
                      <>
                        <Button className="mt-3 w-full gap-2 bg-primary" disabled>
                          <CheckCircle2 className="h-4 w-4" />Submitted — Pending Verification
                        </Button>
                        <Link to="/buyer-dashboard">
                          <Button variant="outline" className="mt-2 w-full gap-2">
                            Go to my dashboard
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Button
                        className="mt-3 w-full gap-2"
                        onClick={handleRequestDetails}
                        disabled={requesting || selectedItems.length === 0}
                      >
                        {requesting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</>
                        ) : (
                          <><FileText className="h-4 w-4" />Submit for Verification</>
                        )}
                      </Button>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 text-center">Your request will be reviewed and approved by our admin team.</p>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="blur-sm pointer-events-none">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="font-medium">Exact Location</p><p className="text-muted-foreground">██████████</p></div>
                  <div><p className="font-medium">Seller Phone</p><p className="text-muted-foreground">+254 ███ ███</p></div>
                  <div><p className="font-medium">Financial Documents</p><p className="text-muted-foreground">██████████</p></div>
                  <div><p className="font-medium">Lease Details</p><p className="text-muted-foreground">██████████</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-border/50 rounded-xl p-5 sticky top-24">
              <p className="text-xs text-muted-foreground font-body mb-1">Asking Price</p>
              <p className="font-heading text-2xl font-bold text-primary">{formatPrice(listing.asking_price)}</p>
              {listing.monthly_net_sales && (
                <p className="text-xs text-muted-foreground font-body mt-2">Monthly Profit: {listing.monthly_net_sales}</p>
              )}
              <hr className="my-4 border-border" />
              <div className="space-y-2 text-sm font-body">
                <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{listing.category}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">County</span><span className="font-medium">{listing.county}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{listing.listing_type}</span></div>
              </div>
              <hr className="my-4 border-border" />
              <div className="flex flex-col gap-2">
                <VerificationBadge type="verified_seller" size="md" />
                <VerificationBadge type="documents_reviewed" size="md" />
              </div>
              <hr className="my-4 border-border" />
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2 font-body text-muted-foreground hover:text-destructive hover:border-destructive">
                    <Flag className="h-3.5 w-3.5" />Report This Listing
                  </Button>
                </DialogTrigger>
                <DialogContent className="font-body">
                  <DialogHeader><DialogTitle className="font-heading">Report This Listing</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Help us keep the marketplace safe. Our admin team will review your report within 24 hours.</p>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label>Reason *</Label>
                      <Select value={reportReason} onValueChange={setReportReason}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fake_listing">Fake / Non-existent Listing</SelectItem>
                          <SelectItem value="misleading_info">Misleading Information</SelectItem>
                          <SelectItem value="duplicate">Duplicate Listing</SelectItem>
                          <SelectItem value="fraud">Suspected Fraud</SelectItem>
                          <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Details *</Label>
                      <Textarea className="mt-1" rows={4} placeholder="Describe what seems incorrect or suspicious..." value={reportDetails} onChange={e => setReportDetails(e.target.value)} />
                    </div>
                    <Button className="w-full" variant="destructive" onClick={handleReport} disabled={reporting}>
                      {reporting ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}