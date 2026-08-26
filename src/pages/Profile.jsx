import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/useAuth";
import { getSession, redirectToLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Camera, Save } from "lucide-react";
import { toast } from "sonner";
import { KENYA_COUNTIES, getSubCountyNames } from "@/utils/kenyaLocations";
import DeleteAccountDialog from "../components/DeleteAccountDialog";

export default function Profile() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({ full_name: "", gender: "", county: "", subcounty: "", profile_picture: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const session = getSession();
      if (!session) { redirectToLogin("/profile"); return; }
      const list = await base44.entities.PhoneUser.filter({ id: session.userId });
      const u = list?.[0];
      if (u) {
        setRecord(u);
        setForm({
          full_name: u.full_name || "",
          gender: u.gender || "",
          county: u.county || "",
          subcounty: u.subcounty || "",
          profile_picture: u.profile_picture || "",
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, profile_picture: file_url }));
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error("Please enter your name."); return; }
    setSaving(true);
    try {
      await base44.entities.PhoneUser.update(record.id, {
        full_name: form.full_name.trim(),
        gender: form.gender,
        county: form.county,
        subcounty: form.subcounty,
        profile_picture: form.profile_picture,
      });
      // Keep session name/picture in sync (these are what others see)
      updateUser({ name: form.full_name.trim(), full_name: form.full_name.trim() });
      toast.success("Profile saved");
      const role = getSession()?.role;
      const dest = role === "admin" ? "/admin" : role === "seller" ? "/seller-dashboard" : "/buyer-dashboard";
      navigate(dest);
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pt-24 flex justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const subCounties = form.county ? getSubCountyNames(form.county) : [];

  return (
    <div className="pt-20 pb-16 min-h-screen bg-secondary/20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-2xl font-bold mb-1">My Profile</h1>
        <p className="text-sm text-muted-foreground font-body mb-6">Manage your personal details and profile picture</p>

        {/* Profile picture + name (public) */}
        <Card className="mb-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center">
                  {form.profile_picture ? (
                    <img src={form.profile_picture} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-sm hover:bg-primary/90">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePictureUpload} disabled={uploading} />
                </label>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="name" className="font-body">Full Name</Label>
                <Input id="name" value={form.full_name} onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))} placeholder="e.g. James Kamau" className="h-11 font-body" />
                <p className="text-[11px] text-muted-foreground font-body">{record?.phone_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biodata */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v }))}>
                <SelectTrigger className="h-11 font-body"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body">County</Label>
                <Select value={form.county} onValueChange={(v) => setForm(prev => ({ ...prev, county: v, subcounty: "" }))}>
                  <SelectTrigger className="h-11 font-body"><SelectValue placeholder="Select county" /></SelectTrigger>
                  <SelectContent>
                    {KENYA_COUNTIES.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Sub-county</Label>
                <Select value={form.subcounty} onValueChange={(v) => setForm(prev => ({ ...prev, subcounty: v }))} disabled={!form.county}>
                  <SelectTrigger className="h-11 font-body"><SelectValue placeholder={form.county ? "Select sub-county" : "Select county first"} /></SelectTrigger>
                  <SelectContent>
                    {subCounties.map(sc => <SelectItem key={sc} value={sc}>{sc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="mt-6 w-full sm:w-auto h-11 font-body font-medium gap-2">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Profile</>}
        </Button>

        <div className="mt-12 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-body mb-3">Account Settings</p>
          <DeleteAccountDialog />
        </div>
      </div>
    </div>
  );
}