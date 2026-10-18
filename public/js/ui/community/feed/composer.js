// Post composer: text with a live character count, optional image, Ctrl+Enter to post.
import { h, icon, replaceChildren, setBusy } from "../../../lib/dom.js";
import { avatar } from "../../../lib/avatar.js";
import { errorMessage, toast } from "../../../lib/toast.js";
import { MAX_POST_IMAGE_BYTES, validateImage } from "../../../services/profiles.js";
import { createPost } from "../../../services/social.js";
import { openAuthDialog } from "../../auth/dialog.js";

const MAX_POST_LENGTH = 1000;

function guestComposer() {
  return h(
    "div.card.composer",
    {},
    h(
      "div.composer-row",
      { style: { alignItems: "center" } },
      avatar({ username: "?" }, 40),
      h("p.muted", { style: { flex: "1" } }, "Log in to post, like and comment."),
      h("button.btn.btn-primary", { type: "button", onclick: () => openAuthDialog("login") }, "Log in")
    )
  );
}

export function composer({ user, onPosted }) {
  if (!user) return guestComposer();

  let imageFile = null;
  const textarea = h("textarea.textarea", {
    placeholder: "Share a result, a tip or a challenge. Use #hashtags.",
    maxlength: MAX_POST_LENGTH,
    rows: 2,
    "aria-label": "Write a post",
  });
  const counter = h("span.composer-count", {}, `0 / ${MAX_POST_LENGTH}`);
  const submit = h("button.btn.btn-primary", { type: "submit", disabled: true }, "Post");
  const fileInput = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true });
  const preview = h("div.composer-preview", { hidden: true });

  const sync = () => {
    counter.textContent = `${textarea.value.length} / ${MAX_POST_LENGTH}`;
    submit.disabled = !textarea.value.trim() && !imageFile;
  };

  const clearImage = () => {
    const img = preview.querySelector("img");
    if (img) URL.revokeObjectURL(img.src);
    imageFile = null;
    preview.hidden = true;
    preview.replaceChildren();
    sync();
  };

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    const problem = validateImage(file, MAX_POST_IMAGE_BYTES);
    if (problem) return toast(problem, "error");
    clearImage();
    imageFile = file;
    replaceChildren(
      preview,
      h("img", { src: URL.createObjectURL(file), alt: "Selected image" }),
      h("button.icon-btn", { type: "button", "aria-label": "Remove image", onclick: clearImage }, icon("x"))
    );
    preview.hidden = false;
    sync();
  });

  const form = h(
    "form.card.composer",
    {},
    h("div.composer-row", {}, avatar(user.profile, 40), h("div", { style: { flex: "1" } }, textarea, preview)),
    h(
      "div.composer-footer",
      {},
      h("button.icon-btn", { type: "button", "aria-label": "Add an image", onclick: () => fileInput.click() }, icon("image")),
      fileInput,
      counter,
      submit
    )
  );

  textarea.addEventListener("input", sync);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) form.requestSubmit();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = textarea.value.trim();
    if (!content && !imageFile) return;
    const restore = setBusy(submit, "Posting");
    try {
      const id = await createPost({ userId: user.id, content, imageFile });
      textarea.value = "";
      clearImage();
      await onPosted(id);
      toast("Posted.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      restore();
      sync();
    }
  });
  return form;
}
