// Profile heading: picture (editable on your own profile), name, join date and bio.
import { h, icon } from "../../lib/dom.js";
import { avatar } from "../../lib/avatar.js";
import { shortDate } from "../../lib/format.js";
import { errorMessage, toast } from "../../lib/toast.js";
import { MAX_AVATAR_BYTES, updateAvatar, validateImage } from "../../services/profiles.js";

function editableAvatar(profile, userId, onChange) {
  const fileInput = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true });
  const button = h(
    "button.avatar-edit",
    { type: "button", "aria-label": "Change profile picture", onclick: () => fileInput.click() },
    avatar(profile, 96),
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
      onChange(await updateAvatar(userId, file));
      toast("Profile picture updated.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      button.removeAttribute("aria-busy");
    }
  });
  return h("div", {}, button, fileInput);
}

// Returns the heading and the slot where page-specific action buttons go.
export function profileHeader(profile, { editable = false, userId, onChange } = {}) {
  const actions = h("div.profile-actions");
  const bio = profile.bio || (editable ? "Add a short bio from the Settings tab." : "No bio yet.");
  const element = h(
    "section.profile-head",
    { "aria-label": "Profile" },
    editable ? editableAvatar(profile, userId, onChange) : avatar(profile, 96),
    h(
      "div",
      {},
      h("h1.profile-name", {}, profile.username),
      profile.created_at && h("p.profile-meta", {}, h("span", {}, icon("calendar-blank"), `Joined ${shortDate(profile.created_at)}`)),
      h(`p.profile-bio${profile.bio ? "" : ".is-empty"}`, {}, bio)
    ),
    actions
  );
  return { element, actions };
}
