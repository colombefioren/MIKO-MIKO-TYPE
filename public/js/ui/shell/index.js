// Shared page chrome. Every page calls initShell() once and gets the auth state back.
import { NAV, pageUrl } from "../../lib/routes.js";
import { isBackendReady } from "../../lib/supabase.js";
import { getAuthState, initAuth, onAuthChange } from "../../services/auth.js";
import { createHeader } from "./header.js";
import { createSidebar } from "./sidebar.js";
import { replayEntranceOnRestore } from "./transitions.js";

export async function initShell(active) {
  const root = document.querySelector("[data-shell]");
  const header = createHeader(root, active);
  // The typing page starts with the sidebar collapsed so the text gets the room, like before.
  root.before(createSidebar({ items: NAV, active, pageUrl, collapsedByDefault: active === "type" }));
  replayEntranceOnRestore();

  if (!isBackendReady) {
    header.render({ user: null, profile: null });
    return getAuthState();
  }

  const state = await initAuth();
  // Token refreshes also notify listeners; only re-render when what is shown changes.
  const keyOf = ({ user, profile }) => [user?.id, profile?.username, profile?.avatar_url].join("|");
  let shownKey = keyOf(state);
  header.render(state);
  onAuthChange((next) => {
    if (keyOf(next) === shownKey) return;
    shownKey = keyOf(next);
    header.render(next);
  });
  return state;
}
