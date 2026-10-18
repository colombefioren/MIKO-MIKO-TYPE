import { $, h, icon, emptyState, replaceChildren } from "../lib/dom.js";
import { plural } from "../lib/format.js";
import { pageUrl } from "../lib/routes.js";
import { isBackendReady } from "../lib/supabase.js";
import { errorMessage } from "../lib/toast.js";
import { getAuthState, onAuthChange, refreshProfile } from "../services/auth.js";
import { getFriendsOf } from "../services/friends.js";
import { getProfile } from "../services/profiles.js";
import { getGuestResults, listResults, listResultsPage } from "../services/results.js";
import { openAuthDialog } from "../ui/auth/dialog.js";
import { createTabs } from "../ui/common/tabs.js";
import { friendsSection } from "../ui/profile/friends.js";
import { profileHeader } from "../ui/profile/header.js";
import { HISTORY_PAGE_SIZE, historySection, pageFromArray } from "../ui/profile/history.js";
import { renderRelationship } from "../ui/profile/relationship.js";
import { settingsSection } from "../ui/profile/settings.js";
import { profileStats, statGrid, summarizeResults } from "../ui/profile/stats.js";
import { initShell } from "../ui/shell/index.js";

const root = $("#profile-root");

async function renderProfile(profileId, viewer) {
  let profile = await getProfile(profileId);
  if (!profile) {
    replaceChildren(root, emptyState({ iconName: "user-circle-dashed", title: "Profile not found", body: "This typist does not exist or deleted their account." }));
    return;
  }
  document.title = `${profile.username} | Miko-Miko Type`;
  const isMe = viewer?.id === profileId;
  const [results, friends] = await Promise.all([listResults(profileId, 50), getFriendsOf(profileId)]);

  const draw = () => {
    const onChange = (updated) => {
      profile = { ...profile, ...updated };
      refreshProfile();
      draw();
    };
    const header = profileHeader(profile, { editable: isMe, userId: viewer?.id, onChange });
    const sections = [
      {
        id: "history",
        label: "History",
        icon: "clock-counter-clockwise",
        content: historySection({
          latest: results,
          loadPage: (page) => listResultsPage(profileId, { page, pageSize: HISTORY_PAGE_SIZE }),
        }),
      },
      { id: "friends", label: `Friends (${friends.length})`, icon: "users-three", content: friendsSection(friends) },
    ];
    if (isMe) sections.push({ id: "settings", label: "Settings", icon: "gear-six", content: settingsSection(viewer, profile, onChange) });
    const tabs = createTabs({ label: "Profile sections", items: sections, initial: location.hash.slice(1), hash: true });

    replaceChildren(root, header.element, statGrid(profileStats(profile)), tabs.elements);

    if (isMe) header.actions.append(h("a.btn.btn-secondary", { href: pageUrl("index.html") }, icon("keyboard"), "Take a test"));
    else if (viewer) renderRelationship(header.actions, viewer, profile);
    else header.actions.append(h("button.btn.btn-primary", { type: "button", onclick: () => openAuthDialog("login") }, "Log in to add friend"));
  };
  draw();
}

function renderGuest() {
  const results = getGuestResults();
  const header = profileHeader(
    { username: "Guest", bio: `${plural(results.length, "test")} saved in this browser. Log in to keep them with your account and appear on the leaderboard.` },
    {}
  );
  if (isBackendReady) {
    header.actions.append(
      h("button.btn.btn-primary", { type: "button", onclick: () => openAuthDialog("signup") }, "Create account"),
      h("button.btn.btn-secondary", { type: "button", onclick: () => openAuthDialog("login") }, "Log in")
    );
  }
  replaceChildren(
    root,
    header.element,
    statGrid(summarizeResults(results)),
    h("h2.section-title", { style: { marginBottom: "14px" } }, "Recent tests"),
    historySection({ latest: results.slice(0, 50), loadPage: pageFromArray(results) })
  );
}

async function render() {
  const { user } = getAuthState();
  const requested = new URLSearchParams(location.search).get("id");
  root.setAttribute("aria-busy", "true");
  try {
    if (requested && isBackendReady) await renderProfile(requested, user);
    else if (user) await renderProfile(user.id, user);
    else renderGuest();
  } catch (error) {
    console.error("Could not load profile", error);
    replaceChildren(root, emptyState({ iconName: "warning-circle", title: "Could not load this profile", body: errorMessage(error) }));
  } finally {
    root.setAttribute("aria-busy", "false");
  }
}

const initial = await initShell("profile");
await render();

let shownUserId = initial.user?.id ?? null;
onAuthChange(({ user }) => {
  if ((user?.id ?? null) === shownUserId) return;
  shownUserId = user?.id ?? null;
  render();
});
