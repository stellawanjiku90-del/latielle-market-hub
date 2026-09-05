import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Store, Tag } from "lucide-react";
import DocumentViewer from "./DocumentViewer";

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/30 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value || "—"}</span>
    </div>
  );
}

export default function ListingReviewModal({ open, onOpenChange, listing, onApprove, onReject, onMarkSold, onRestore }) {
  const [mode, setMode] = useState("review"); // review | reject
  const [reason, setReason] = useState("");
  const [soldPrice, setSoldPrice] = useState(listing?.sold_price ?? "");

  useEffect(() => {
    if (open) { setMode("review"); setReason(""); setSoldPrice(listing?.sold_price ?? ""); }
  }, [open, listing?.id]);

  if (!listing) return null;

  const allDocs = [
    ...(listing.business_licence || []),
    ...(listing.registration_cert || []),
    ...(listing.owner_id_docs || []),
    ...(listing.financial_docs || []),
    ...(listing.lease_docs || []),
  ];

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(listing.id, reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-body max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />Review Business Listing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{listing.title || `${listing.category} - ${listing.county}`}</h3>
            <Badge variant={listing.status === "approved" ? "default" : listing.status === "pending" ? "outline" : "secondary"} className="text-[10px]">
              {listing.status === "pending" ? "Pending Review" : listing.status}
            </Badge>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Business Details</p>
            <div className="space-y-0">
              <DetailRow label="Business Name" value={listing.title} />
              <DetailRow label="Category" value={listing.category} />
              <DetailRow label="Owner / Submitted by" value={listing.created_by} />
              <DetailRow label="Seller Phone" value={listing.seller_phone} />
              <DetailRow label="County" value={listing.county} />
              <DetailRow label="Exact Location" value={listing.exact_location} />
              <DetailRow label="Asking Price" value={listing.asking_price ? `KES ${Number(listing.asking_price).toLocaleString()}` : null} />
              <DetailRow label="Years Operating" value={listing.years_operating} />
              <DetailRow label="Employees" value={listing.employees} />
              <DetailRow label="Monthly Gross Sales" value={listing.monthly_gross_sales} />
              <DetailRow label="Monthly Net Profit" value={listing.monthly_net_sales} />
              <DetailRow label="Financial Records" value={listing.financial_records_available} />
              <DetailRow label="Reason for Selling" value={listing.reason_for_selling} />
              <DetailRow label="Listing Type" value={listing.listing_type} />
            </div>
          </div>

          {listing.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {(listing.supplier_info || listing.staff_info) && (
            <div className="space-y-2">
              {listing.supplier_info && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Supplier Info</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.supplier_info}</p>
                </div>
              )}
              {listing.staff_info && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Staff Info</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.staff_info}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />Business Documents
            </p>
            {(listing.photos?.length > 0) && (
              <div className="mb-3">
                <p className="text-[11px] text-muted-foreground mb-1.5">Photos</p>
                <DocumentViewer documents={listing.photos} />
              </div>
            )}
            <div className="mb-1">
              <p className="text-[11px] text-muted-foreground mb-1.5">Licence, Registration, ID & Financial Documents</p>
              <DocumentViewer documents={allDocs} />
            </div>
          </div>

          {(listing.status === "approved" || listing.status === "active" || listing.status === "sold") && mode === "review" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale status</p>
              {listing.status === "sold" ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Marked as sold</p>
                    {listing.sold_price != null && <p className="text-xs text-muted-foreground">Sold price: KES {Number(listing.sold_price).toLocaleString()}</p>}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => onRestore?.(listing.id)}>Restore Listing</Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="Sold price (optional)"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="button" variant="outline" className="text-sm gap-1.5" onClick={() => onMarkSold?.(listing.id, soldPrice)}>
                    <Tag className="h-4 w-4" />Mark as Sold
                  </Button>
                </div>
              )}
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <Label className="text-xs">Reason for rejection (required)</Label>
              <Textarea
                rows={3}
                placeholder="Explain why this listing is being rejected so the seller can fix it…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {mode === "review" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">Cancel</Button>
              <Button variant="destructive" onClick={() => setMode("reject")} className="text-sm gap-1.5">
                <XCircle className="h-4 w-4" />Reject
              </Button>
              <Button onClick={() => onApprove(listing.id)} className="text-sm gap-1.5">
                <CheckCircle className="h-4 w-4" />Approve
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode("review")} className="text-sm">Back</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!reason.trim()} className="text-sm gap-1.5">
                <XCircle className="h-4 w-4" />Confirm Reject
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
