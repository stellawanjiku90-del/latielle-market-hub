import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MessageSquare, History } from "lucide-react";

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/30 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value || "—"}</span>
    </div>
  );
}

export default function BuyerRequestReviewModal({ open, onOpenChange, request, onApprove, onReject }) {
  const [mode, setMode] = useState("review"); // review | reject
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) { setMode("review"); setReason(""); }
  }, [open, request?.id]);

  if (!request) return null;

  const history = request.response_history || [];
  const isClosed = request.status === "approved" || request.status === "rejected";

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(request.id, reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-body max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />Review Buyer Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-0">
            <DetailRow label="Listing" value={request.listing_title} />
            <DetailRow label="Buyer" value={request.buyer_email} />
            <DetailRow label="Seller" value={request.seller_email} />
            <DetailRow label="Submitted" value={request.created_date ? new Date(request.created_date).toLocaleString() : null} />
            <DetailRow label="Status" value={request.status} />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Buyer's Request Message</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/40 rounded-lg p-3">{request.message || "—"}</p>
          </div>

          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />History
              </p>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-2.5 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={h.type === "rejection" ? "destructive" : "default"} className="text-[10px]">{h.type === "rejection" ? "Rejected" : "Sent"}</Badge>
                      <span className="text-[10px] text-muted-foreground">{h.sent_at ? new Date(h.sent_at).toLocaleString() : ""}</span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line">{h.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isClosed && mode === "review" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Approving this request opens a secure chat where the buyer and seller communicate directly. Both parties will be notified.
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <Label className="text-xs">Reason for rejection (required)</Label>
              <Textarea
                rows={3}
                placeholder="Explain why this request is being rejected…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isClosed ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">Close</Button>
          ) : mode === "review" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">Cancel</Button>
              <Button variant="destructive" onClick={() => setMode("reject")} className="text-sm gap-1.5">
                <XCircle className="h-4 w-4" />Reject Request
              </Button>
              <Button onClick={() => onApprove(request.id)} className="text-sm gap-1.5">
                <CheckCircle className="h-4 w-4" />Approve & Open Chat
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
