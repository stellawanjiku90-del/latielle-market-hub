import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";

export default function RejectListingDialog({ open, onOpenChange, listingTitle, onConfirm }) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(""); }}>
      <DialogContent className="font-body sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />Reject Listing
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground truncate">{listingTitle}</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason for rejection (required)</Label>
            <Textarea
              rows={4}
              placeholder="Explain why this listing is being rejected so the seller can fix it…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()} className="text-sm gap-1.5">
            <XCircle className="h-4 w-4" />Reject with Reason
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}