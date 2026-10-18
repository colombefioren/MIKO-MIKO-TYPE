// Draws the sidebar and header once per page, before the page's own module runs, using the
// last known account. Nothing here imports Supabase, so the shell paints without waiting.
import { readAccountHint } from "../../lib/accountHint.js";
import { NAV, pageUrl } from "../../lib/routes.js";
import { SUPABASE } from "../../config.js";
import { createHeader } from "./header.js";
import { createSidebar } from "./sidebar.js";
import { replayEntranceOnRestore } from "./transitions.js";

let frame = null;

export function mountShell(active = document.body.dataset.page) {
  if (frame) return frame;
  const root = document.querySelector("[data-shell]");
  const header = createHeader(root, active);
  // The typing page starts with the sidebar collapsed so the text gets the room, like before.
  root.before(createSidebar({ items: NAV, active, pageUrl, collapsedByDefault: active === "type" }));
  replayEntranceOnRestore();
  header.show(SUPABASE.url ? readAccountHint() : null);
  frame = { header };
  return frame;
}
