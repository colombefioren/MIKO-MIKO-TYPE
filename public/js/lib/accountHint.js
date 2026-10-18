// The last signed-in account shown in the header, so the next page can draw it before
// the real session check finishes. Holds only public profile fields.
const KEY = "mikomiko:account-hint";

export function readAccountHint() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function writeAccountHint(profile) {
  try {
    if (profile) localStorage.setItem(KEY, JSON.stringify({ id: profile.id, username: profile.username, avatar_url: profile.avatar_url ?? null }));
    else localStorage.removeItem(KEY);
  } catch {
    // Without storage the header simply fills in after the session check.
  }
}
