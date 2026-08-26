import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirm.toUpperCase() !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }
    setLoading(true);
    // Send data deletion request email to admin
    await base44.integrations.Core.SendEmail({
      to: "realityofafrica2023@gmail.com",
      subject: "Account Deletion Request",
      body: `A user has requested deletion of their account.\n\nPlease process this request and permanently delete all associated data from the platform.\n\nThis request was submitted via the app at ${new Date().toISOString()}.`,
    });
    toast.success("Deletion request submitted. Your account will be removed within 30 days.");
    setLoading(false);
    setOpen(false);
    base44.auth.logout();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-destructive font-body hover:underline select-none"
      >
        <Trash2 className="h-4 w-4" />
        Delete My Account
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="font-body">
          <DialogHeader>
            <DialogTitle className="font-heading text-destructive">Delete Your Account</DialogTitle>
            <DialogDescription>
              This is permanent and cannot be undone. All your data — listings, requests, messages — will be deleted within 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-sm text-muted-foreground space-y-1.5">
              <p>⚠️ All your business listings will be removed.</p>
              <p>⚠️ All messages and conversations will be deleted.</p>
              <p>⚠️ Detail requests and transaction history will be lost.</p>
            </div>
            <div>
              <p className="text-sm mb-2">Type <span className="font-bold text-foreground">DELETE</span> to confirm:</p>
              <Input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Type DELETE here"
                className="font-mono"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 select-none" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1 select-none"
                disabled={confirm.toUpperCase() !== "DELETE" || loading}
                onClick={handleDelete}
              >
                {loading ? "Submitting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}