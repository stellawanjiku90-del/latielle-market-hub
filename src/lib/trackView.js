import { api } from "@/api/apiClient";

// Increments a listing's views_count once per browser session per listing.
// Works for logged-in users and guests (uses sessionStorage).
export async function trackListingView(listingId) {
  if (!listingId) return null;
  const key = `viewed_listing_${listingId}`;
  if (sessionStorage.getItem(key)) return null;
  sessionStorage.setItem(key, "1");
  try {
    const result = await api.request(`/api/listings/${encodeURIComponent(listingId)}/view`, { method: "POST" });
    return result?.views_count ?? null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}
