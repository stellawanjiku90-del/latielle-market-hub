import { base44 } from "@/api/base44Client";

// Increments a listing's views_count once per browser session per listing.
// Works for logged-in users and guests (uses sessionStorage).
export async function trackListingView(listingId, currentCount = 0) {
  if (!listingId) return null;
  const key = `viewed_listing_${listingId}`;
  if (sessionStorage.getItem(key)) return null;
  sessionStorage.setItem(key, "1");
  const newCount = (Number(currentCount) || 0) + 1;
  try {
    await base44.entities.BusinessListing.update(listingId, { views_count: newCount });
    return newCount;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}