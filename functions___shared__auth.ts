export async function requireAuthenticated(base44: any) {
  const user = await base44.auth.me();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(base44: any) {
  const user = await requireAuthenticated(base44);
  const phone = user.phone || user.phone_number || "";
  const matches = await base44.asServiceRole.entities.PhoneUser.filter({ phone_number: phone });
  const profile = matches?.[0];
  if (profile?.role !== "admin") throw new Error("FORBIDDEN");
  return { user, profile };
}

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return Response.json({ success: false, error: message }, { status });
}

export function normalizePhone(value: string) {
  const raw = String(value || "").replace(/\s+/g, "").replace(/^\+/, "");
  if (/^0\d{9}$/.test(raw)) return `+254${raw.slice(1)}`;
  if (/^254\d{9}$/.test(raw)) return `+${raw}`;
  if (/^\d{10,15}$/.test(raw)) return `+${raw}`;
  throw new Error("INVALID_PHONE");
}
