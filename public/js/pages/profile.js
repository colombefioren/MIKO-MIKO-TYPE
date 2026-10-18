import { $, h, icon, emptyState, replaceChildren, setBusy } from "../lib/dom.js";
import { avatar } from "../lib/avatar.js";
import { round, shortDate, timeAgo, duration, plural } from "../lib/format.js";
import { isBackendReady } from "../lib/supabase.js";
import { errorMessage, toast } from "../lib/toast.js";
import { initShell, pageUrl, profileUrl } from "../ui/shell.js";
import { openAuthDialog } from "../ui/authDialog.js";
import { confirmAction } from "../ui/confirm.js";
import { changePassword, getAuthState, onAuthChange, refreshProfile, USERNAME_PATTERN } from "../services/auth.js";
import { getProfile, updateProfile, updateAvatar, validateImage, MAX_AVATAR_BYTES } from "../services/profiles.js";
import { getGuestResults, listResults } from "../services/results.js";
import {
  acceptFriendRequest,
  getFriendsOf,
  getFriendshipWith,
  removeFriendship,
  sendFriendRequest,
} from "../services/friends.js";
import { onOnlineChange } from "../services/realtime.js";
import { renderHistoryChart } from "../game/chart.js";

const root = $("#profile-root");
let stopPresence = () => {};

// ------------------------------------------------------------------ Stats

function summarizeResults(results) {
  if (!results.length) return { tests: 0, bestWpm: 0, avgWpm: 0, bestAccuracy: 0, avgAccuracy: 0 };
  const wpm = results.map((r) => Number(r.wpm));
  const acc = results.map((r) => Number(r.accuracy));
  const avg = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
  return { tests: results.length, bestWpm: Math.max(...wpm), avgWpm: avg(wpm), bestAccuracy: Math.max(...acc), avgAccuracy: avg(acc) };
}

function statGrid({ tests, bestWpm, avgWpm, bestAccuracy, avgAccuracy }) {
  const tile = (label, value, feature = false) =>
    h(`div.card.stat-tile${feature ? ".is-feature" : ""}`, {}, h("p.stat-label", {}, label), h("p.stat-value", {}, value));
  return h(
    "div.stat-grid",
    {},
    tile("Best wpm", round(bestWpm), true),
    tile("Average wpm", round(avgWpm)),
    tile("Best accuracy", `${round(bestAccuracy, 1)}%`),
    tile("Average accuracy", `${round(avgAccuracy, 1)}%`),
    tile("Tests", tests)
  );
}

function historySection(results) {
  if (!results.length) {
    return emptyState({
      iconName: "keyboard",
      title: "No tests yet",
      body: "Finished tests show up here with speed and accuracy.",
      action: h("a.btn.btn-primary", { href: pageUrl("index.html") }, "Take a test"),
    });
  }

  const canvas = h("canvas", { role: "img", "aria-label": "Speed and accuracy over the latest tests" });
  const chart = h("div.card.history-chart", {}, canvas);
  // Oldest first so the line reads left to right.
  queueMicrotask(() => renderHistoryChart(canvas, [...results].reverse()));

  const rows = results.slice(0, 20).map((result) =>
    h(
      "div.history-row",
      {},
      h("span", { title: new Date(result.created_at).toLocaleString() }, timeAgo(result.created_at)),
      h("span.muted", {}, `${result.difficulty}, ${result.word_count} words`),
      h("span.num", {}, round(result.wpm)),
      h("span.num", {}, `${round(result.accuracy, 1)}%`),
      h("span.num.muted", {}, duration(result.duration_ms))
    )
  );

  return h(
    "div",
    {},
    results.length > 1 ? chart : null,
    h(
      "div.card.history-list",
      {},
      h("div.history-row.board-head", {}, h("span", {}, "When"), h("span", {}, "Test"), h("span.num", {}, "WPM"), h("span.num", {}, "Accuracy"), h("span.num", {}, "Time")),
      rows
    )
  );
}

// ------------------------------------------------------------------ Friends

function friendsSection(friends) {
  if (!friends.length) {
    return emptyState({ iconName: "users-three", title: "No friends yet", body: "Find people from the Community page and send a request." });
  }
  const grid = h(
    "div.friend-grid",
    {},
    friends.map(({ other }) =>
      h(
        "a.card.friend-card",
        { href: profileUrl(other.id) },
        h("span.avatar-wrap", { dataset: { presence: other.id } }, avatar(other, 40)),
        h("span.list-main", {}, h("span.list-title", {}, other.username), h("span.list-sub", {}, `Best ${round(other.best_wpm)} wpm`))
      )
    )
  );
  // Real presence state: shown only for friends connected right now.
  stopPresence();
  stopPresence = onOnlineChange((online) => {
    for (const wrap of grid.querySelectorAll("[data-presence]")) {
      const has = wrap.querySelector(".online-dot");
      if (online.has(wrap.dataset.presence) && !has) wrap.append(h("span.online-dot", { title: "Online" }));
      if (!online.has(wrap.dataset.presence) && has) has.remove();
    }
  });
  return grid;
}

async function friendActions(container, me, profile) {
  const render = async () => {
    let friendship;
    try {
      friendship = await getFriendshipWith(me.id, profile.id);
    } catch (error) {
      console.error(error);
      return;
    }

    const run = (label, action, success) => async (event) => {
      const restore = setBusy(event.currentTarget, label);
      try {
        await action();
        if (success) toast(success, "success");
        await render();
      } catch (error) {
        restore();
        toast(errorMessage(error), "error");
      }
    };

    const buttons = [];
    if (!friendship) {
      buttons.push(h("button.btn.btn-primary", { type: "button", onclick: run("Sending", () => sendFriendRequest(me.id, profile.id), "Friend request sent.") }, icon("user-plus"), "Add friend"));
    } else if (friendship.status === "pending" && friendship.incoming) {
      buttons.push(
        h("button.btn.btn-primary", { type: "button", onclick: run("Accepting", () => acceptFriendRequest(friendship.id), "You are now friends.") }, icon("check"), "Accept request"),
        h("button.btn.btn-secondary", { type: "button", onclick: run("Declining", () => removeFriendship(friendship.id)) }, "Decline")
      );
    } else if (friendship.status === "pending") {
      buttons.push(h("button.btn.btn-secondary", { type: "button", onclick: run("Cancelling", () => removeFriendship(friendship.id), "Request cancelled.") }, icon("clock"), "Cancel request"));
    } else {
      buttons.push(
        h("a.btn.btn-primary", { href: pageUrl(`pages/friends.html?chat=${encodeURIComponent(profile.id)}`) }, icon("chat-circle"), "Message"),
        h(
          "button.btn.btn-danger",
          {
            type: "button",
            onclick: async (event) => {
              const button = event.currentTarget;
              const ok = await confirmAction({ title: `Remove ${profile.username}?`, body: "You will no longer be able to message each other.", confirmLabel: "Unfriend", danger: true });
              if (ok) run("Removing", () => removeFriendship(friendship.id), "Friend removed.")({ currentTarget: button });
            },
          },
          "Unfriend"
        )
      );
    }
    replaceChildren(container, buttons);
  };
  await render();
}

// ------------------------------------------------------------------ Settings

function charCounter(field, max) {
  const counter = h("span.composer-count", { "aria-live": "polite" });
  const update = () => (counter.textContent = `${field.value.length} / ${max}`);
  field.addEventListener("input", update);
  update();
  return counter;
}

function settingsSection(user, profile, onProfileChange) {
  // Display name
  const usernameInput = h("input.input", {
    id: "settings-username",
    value: profile.username,
    required: true,
    minlength: 3,
    maxlength: 24,
    pattern: "[A-Za-z0-9_.\\-]{3,24}",
    autocomplete: "username",
    "aria-describedby": "settings-username-hint",
  });
  const usernameForm = h(
    "form.stack",
    {},
    h("h2.section-title", {}, "Username"),
    h(
      "div.field",
      {},
      h("label.field-label", { for: "settings-username" }, "Username"),
      h("div.inline-form", {}, usernameInput, h("button.btn.btn-primary", { type: "submit" }, "Save")),
      h("p.field-hint", { id: "settings-username-hint" }, "Letters, numbers, dot, dash or underscore. Shown to everyone.")
    )
  );
  usernameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    if (!USERNAME_PATTERN.test(username)) return toast("Use 3 to 24 letters, numbers, dots, dashes or underscores.", "error");
    const restore = setBusy(usernameForm.querySelector("[type=submit]"), "Saving");
    try {
      const updated = await updateProfile(user.id, { username });
      onProfileChange(updated);
      toast("Username updated.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      restore();
    }
  });

  // Bio
  const bioInput = h("textarea.textarea", { id: "settings-bio", maxlength: 280, rows: 3 }, profile.bio ?? "");
  const bioForm = h(
    "form.stack",
    {},
    h("h2.section-title", {}, "Bio"),
    h("div.field", {}, h("label.field-label", { for: "settings-bio" }, "About you"), bioInput),
    h("div.composer-footer", {}, charCounter(bioInput, 280), h("button.btn.btn-primary", { type: "submit" }, "Save bio"))
  );
  bioForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const restore = setBusy(bioForm.querySelector("[type=submit]"), "Saving");
    try {
      const updated = await updateProfile(user.id, { bio: bioInput.value.trim() });
      onProfileChange(updated);
      toast("Bio updated.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      restore();
    }
  });

  // Password
  const passwordField = (id, label, autocomplete) =>
    h("div.field", {}, h("label.field-label", { for: id }, label), h("input.input", { id, name: id, type: "password", required: true, autocomplete, minlength: id === "current-password" ? undefined : 8 }));
  const passwordError = h("p.form-error", { role: "alert", hidden: true });
  const passwordForm = h(
    "form.stack",
    {},
    h("h2.section-title", {}, "Password"),
    h("div.field", {}, h("label.field-label", { for: "settings-email" }, "Email"), h("input.input", { id: "settings-email", type: "email", value: user.email, disabled: true })),
    passwordField("current-password", "Current password", "current-password"),
    passwordField("new-password", "New password", "new-password"),
    passwordField("confirm-password", "Confirm new password", "new-password"),
    passwordError,
    h("div", {}, h("button.btn.btn-primary", { type: "submit" }, "Update password"))
  );
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { elements } = passwordForm;
    const current = elements["current-password"].value;
    const next = elements["new-password"].value;
    const confirm = elements["confirm-password"].value;
    const fail = (message) => {
      passwordError.textContent = message;
      passwordError.hidden = false;
    };
    passwordError.hidden = true;
    if (next.length < 8) return fail("Use at least 8 characters for the new password.");
    if (next !== confirm) return fail("The new passwords do not match.");
    if (next === current) return fail("Pick a password different from the current one.");

    const restore = setBusy(passwordForm.querySelector("[type=submit]"), "Updating");
    try {
      await changePassword(current, next);
      passwordForm.reset();
      elements["settings-email"].value = user.email;
      toast("Password updated.", "success");
    } catch (error) {
      fail(errorMessage(error));
    } finally {
      restore();
    }
  });

  return h("div.settings-grid", {}, h("div.card", {}, usernameForm), h("div.card", {}, bioForm), h("div.card", {}, passwordForm));
}

// ------------------------------------------------------------------ Page

function tabs(sections, initial) {
  const tabList = h("div.tabs", { role: "tablist", "aria-label": "Profile sections" });
  const panels = [];
  const buttons = [];

  const select = (index, focus = false) => {
    buttons.forEach((button, i) => {
      button.setAttribute("aria-selected", String(i === index));
      button.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) buttons[index].focus();
    history.replaceState(null, "", `${location.pathname}${location.search}#${sections[index].id}`);
  };

  sections.forEach((section, index) => {
    const button = h(
      "button.tab",
      { type: "button", role: "tab", id: `tab-${section.id}`, "aria-controls": `panel-${section.id}`, onclick: () => select(index) },
      icon(section.icon),
      section.label
    );
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") select((index + 1) % sections.length, true);
      if (event.key === "ArrowLeft") select((index - 1 + sections.length) % sections.length, true);
    });
    buttons.push(button);
    tabList.append(button);
    panels.push(h("div", { role: "tabpanel", id: `panel-${section.id}`, "aria-labelledby": `tab-${section.id}` }, section.content));
  });

  const start = Math.max(0, sections.findIndex((section) => section.id === initial));
  select(start);
  return [tabList, ...panels];
}

function header(profile, { editable, user, onAvatarChange }) {
  const picture = avatar(profile, 96);
  let pictureSlot = picture;

  if (editable) {
    const fileInput = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true });
    const button = h(
      "button.avatar-edit",
      { type: "button", "aria-label": "Change profile picture", onclick: () => fileInput.click() },
      picture,
      h("span.avatar-edit-overlay", { "aria-hidden": "true" }, icon("camera"))
    );
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      const problem = validateImage(file, MAX_AVATAR_BYTES);
      if (problem) return toast(problem, "error");
      button.setAttribute("aria-busy", "true");
      try {
        const updated = await updateAvatar(user.id, file);
        onAvatarChange(updated);
        toast("Profile picture updated.", "success");
      } catch (error) {
        toast(errorMessage(error), "error");
      } finally {
        button.removeAttribute("aria-busy");
      }
    });
    pictureSlot = h("div", {}, button, fileInput);
  }

  const actions = h("div.profile-actions");
  return {
    actions,
    el: h(
      "section.profile-head",
      { "aria-label": "Profile" },
      pictureSlot,
      h(
        "div",
        {},
        h("h1.profile-name", {}, profile.username),
        h("p.profile-meta", {}, h("span", {}, icon("calendar-blank"), `Joined ${shortDate(profile.created_at)}`)),
        h(`p.profile-bio${profile.bio ? "" : ".is-empty"}`, {}, profile.bio || (editable ? "Add a short bio from the Settings tab." : "No bio yet."))
      ),
      actions
    ),
  };
}

async function renderProfile(profileId, viewer) {
  const isMe = viewer?.id === profileId;
  let profile = await getProfile(profileId);
  if (!profile) {
    replaceChildren(root, emptyState({ iconName: "user-circle-dashed", title: "Profile not found", body: "This typist does not exist or deleted their account." }));
    return;
  }
  document.title = `${profile.username} | Miko-Miko Type`;

  const [results, friends] = await Promise.all([listResults(profileId, 50), getFriendsOf(profileId)]);

  const rerender = (updated) => {
    profile = { ...profile, ...updated };
    refreshProfile();
    draw();
  };

  function draw() {
    const { el, actions } = header(profile, { editable: isMe, user: viewer, onAvatarChange: rerender });
    const sections = [
      { id: "history", label: "History", icon: "clock-counter-clockwise", content: historySection(results) },
      { id: "friends", label: `Friends (${friends.length})`, icon: "users-three", content: friendsSection(friends) },
    ];
    if (isMe) sections.push({ id: "settings", label: "Settings", icon: "gear-six", content: settingsSection(viewer, profile, rerender) });

    replaceChildren(
      root,
      el,
      statGrid({
        tests: profile.tests_count,
        bestWpm: profile.best_wpm,
        avgWpm: profile.avg_wpm,
        bestAccuracy: profile.best_accuracy,
        avgAccuracy: profile.avg_accuracy,
      }),
      tabs(sections, location.hash.slice(1))
    );

    if (isMe) actions.append(h("a.btn.btn-secondary", { href: pageUrl("index.html") }, icon("keyboard"), "Take a test"));
    else if (viewer) friendActions(actions, viewer, profile);
    else actions.append(h("button.btn.btn-primary", { type: "button", onclick: () => openAuthDialog("login") }, "Log in to add friend"));
  }

  draw();
}

function renderGuest() {
  const results = getGuestResults();
  replaceChildren(
    root,
    h(
      "section.profile-head",
      { "aria-label": "Guest" },
      avatar({ username: "Guest" }, 96),
      h(
        "div",
        {},
        h("h1.profile-name", {}, "Guest"),
        h("p.profile-bio", {}, `${plural(results.length, "test")} saved in this browser. Log in to keep them with your account and appear on the leaderboard.`)
      ),
      h(
        "div.profile-actions",
        {},
        isBackendReady && h("button.btn.btn-primary", { type: "button", onclick: () => openAuthDialog("signup") }, "Create account"),
        isBackendReady && h("button.btn.btn-secondary", { type: "button", onclick: () => openAuthDialog("login") }, "Log in")
      )
    ),
    statGrid(summarizeResults(results)),
    h("h2.section-title", { style: { marginBottom: "14px" } }, "Recent tests"),
    historySection(results)
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
