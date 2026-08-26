import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MapPin, Pencil } from "lucide-react";

export default function DashboardProfileHeader({ session, title }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!session?.userId) return;
    base44.entities.PhoneUser.filter({ id: session.userId }).then(list => {
      if (list?.[0]) setProfile(list[0]);
    });
  }, [session?.userId]);

  const name = profile?.full_name || session?.name || session?.phone || title;
  const location = [profile?.subcounty, profile?.county].filter(Boolean).join(", ");

  return (
    <Card className="mb-8">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
          {profile?.profile_picture ? (
            <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold truncate">{title}</h1>
          <p className="text-sm text-foreground font-body truncate">{name}</p>
          {location && (
            <p className="text-xs text-muted-foreground font-body flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{location}
            </p>
          )}
        </div>
        <Link to="/profile" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 font-body text-xs">
            <Pencil className="h-3.5 w-3.5" />Edit Profile
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}