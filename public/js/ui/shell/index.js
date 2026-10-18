// Shared page chrome. Every page calls initShell() once and gets the auth state back.
import { writeAccountHint } from "../../lib/accountHint.js";
import { isBackendReady } from "../../lib/supabase.js";
import { getAuthState, initAuth, onAuthChange } from "../../services/auth.js";
import { mountShell } from "./frame.js";

const accountOf = ({ user, profile }) => (user ? profile ?? { id: user.id, username: user.email, avatar_url: null } : null);

export async function initShell(active) {
  const { header } = mountShell(active);

  if (!isBackendReady) {
    header.show(null);
    return getAuthState();
  }

  const apply = (state) => {
    const account = accountOf(state);
    writeAccountHint(account);
    header.show(account);
    if (state.user) header.goLive(state.user.id);
    else header.goOffline();
  };

  const state = await initAuth();
  apply(state);
  // Token refreshes also notify listeners; only act when the signed-in user changes.
  let userId = state.user?.id ?? null;
  onAuthChange((next) => {
    if ((next.user?.id ?? null) !== userId) {
      userId = next.user?.id ?? null;
      apply(next);
    } else header.show(accountOf(next));
  });
  return state;
}
