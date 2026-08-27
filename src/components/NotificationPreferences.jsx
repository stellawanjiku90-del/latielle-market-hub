import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Kajiado", "Uasin Gishu", "Kilifi", "Nyeri", "Meru", "Kwale", "Laikipia", "Nyandarua", "Murang'a", "Trans Nzoia", "Kakamega", "Bungoma", "Narok"];
const CATEGORIES = ["Salon", "Barbershop", "Restaurant", "School", "Cyber Café", "Hardware Shop", "Supermarket", "Car Wash", "Hotel", "Pharmacy", "Boutique", "Electronics Shop", "Gym", "Café", "Online Business", "Franchise", "Other"];

export default function NotificationPreferences({ user }) {
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ counties: [], categories: [], min_budget: "", max_budget: "" });

  useEffect(() => {
    if (!user?.email) return;
    api.entities.BuyerPreference.filter({ buyer_email: user.email }, "-created_date", 20)
      .then(data => { setPrefs(data); setLoading(false); });
  }, [user]);

  const toggleCounty = (c) => setForm(f => ({
    ...f, counties: f.counties.includes(c) ? f.counties.filter(x => x !== c) : [...f.counties, c]
  }));

  const toggleCategory = (c) => setForm(f => ({
    ...f, categories: f.categories.includes(c) ? f.categories.filter(x => x !== c) : [...f.categories, c]
  }));

  const handleCreate = async () => {
    if (form.counties.length === 0) { toast.error("Select at least one county."); return; }
    if (!form.max_budget) { toast.error("Enter a maximum budget."); return; }
    await api.entities.BuyerPreference.create({
      buyer_email: user.email,
      buyer_name: user.full_name,
      counties: form.counties,
      categories: form.categories,
      min_budget: form.min_budget ? Number(form.min_budget) : undefined,
      max_budget: Number(form.max_budget),
      is_active: true,
    });
    const updated = await api.entities.BuyerPreference.filter({ buyer_email: user.email }, "-created_date", 20);
    setPrefs(updated);
    setForm({ counties: [], categories: [], min_budget: "", max_budget: "" });
    setCreating(false);
    toast.success("Alert created! You'll be notified when matching listings go live.");
  };

  const toggleActive = async (pref) => {
    await api.entities.BuyerPreference.update(pref.id, { is_active: !pref.is_active });
    setPrefs(prev => prev.map(p => p.id === pref.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleDelete = async (id) => {
    await api.entities.BuyerPreference.delete(id);
    setPrefs(prev => prev.filter(p => p.id !== id));
    toast.success("Alert deleted.");
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-body">Get emailed when a new listing matches your criteria.</p>
        {!creating && <Button size="sm" className="gap-1.5 font-body" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New Alert</Button>}
      </div>

      {creating && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold">Create New Alert</h3>

            <div>
              <Label className="text-xs text-muted-foreground font-body mb-2 block">Counties to watch *</Label>
              <div className="flex flex-wrap gap-1.5">
                {COUNTIES.map(c => (
                  <button key={c} onClick={() => toggleCounty(c)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-body transition-colors ${form.counties.includes(c) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground font-body mb-2 block">Categories (leave empty for any)</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => toggleCategory(c)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-body transition-colors ${form.categories.includes(c) ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-accent/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-body">Min Budget (KES)</Label>
                <Input type="number" placeholder="e.g. 500000" value={form.min_budget} onChange={e => setForm(f => ({ ...f, min_budget: e.target.value }))} className="mt-1 font-body" />
              </div>
              <div>
                <Label className="text-xs font-body">Max Budget (KES) *</Label>
                <Input type="number" placeholder="e.g. 5000000" value={form.max_budget} onChange={e => setForm(f => ({ ...f, max_budget: e.target.value }))} className="mt-1 font-body" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" className="font-body" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="sm" className="font-body gap-1.5" onClick={handleCreate}><Bell className="h-3.5 w-3.5" />Save Alert</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {prefs.length === 0 && !creating ? (
        <Card><CardContent className="py-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-body text-sm">No alerts set up yet. Create one to get notified!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {prefs.map(pref => (
            <Card key={pref.id} className={`transition-opacity ${!pref.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    {pref.counties?.map(c => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground font-body">
                    Budget: {pref.min_budget ? `KES ${pref.min_budget.toLocaleString()} –` : "Up to"} KES {(pref.max_budget || 0).toLocaleString()}
                    {pref.categories?.length > 0 && ` · ${pref.categories.join(", ")}`}
                  </p>
                  <Badge variant={pref.is_active ? "default" : "outline"} className="text-[10px]">
                    {pref.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleActive(pref)} title={pref.is_active ? "Pause" : "Resume"}>
                    {pref.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(pref.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}