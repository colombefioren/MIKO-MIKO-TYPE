import { SUPABASE } from "../config.js";

// Only images served by this project's storage are rendered, never arbitrary third-party URLs.
export function isStorageUrl(url) {
  if (!url || !SUPABASE.url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(SUPABASE.url).origin && parsed.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}
