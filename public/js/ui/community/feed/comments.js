// Comment threads under posts, loaded the first time a thread is opened.
import { $, h, replaceChildren, setBusy, skeletonRows } from "../../../lib/dom.js";
import { avatar } from "../../../lib/avatar.js";
import { timeAgo } from "../../../lib/format.js";
import { profileUrl } from "../../../lib/routes.js";
import { errorMessage, toast } from "../../../lib/toast.js";
import { addComment, deleteComment, getComments } from "../../../services/social.js";
import { openAuthDialog } from "../../auth/dialog.js";
import { confirmAction } from "../../common/confirm.js";
import { bumpCount } from "./post.js";

export function createComments({ list, getUser }) {
  function item(comment) {
    const remove = async () => {
      if (!(await confirmAction({ title: "Delete this comment?", confirmLabel: "Delete", danger: true }))) return;
      try {
        await deleteComment(comment.id);
        removeComment(comment.id);
      } catch (error) {
        toast(errorMessage(error), "error");
      }
    };
    return h(
      "div.comment",
      { dataset: { commentId: comment.id } },
      avatar(comment.author, 32),
      h(
        "div.comment-bubble",
        {},
        h(
          "div.comment-meta",
          {},
          h("a.user-link", { href: profileUrl(comment.user_id) }, comment.author?.username ?? "Unknown"),
          h("span.muted", {}, timeAgo(comment.created_at)),
          comment.user_id === getUser()?.id && h("button.comment-delete", { type: "button", onclick: remove }, "Delete")
        ),
        h("p", {}, comment.content)
      )
    );
  }

  function replyForm(postId) {
    const input = h("input.input", { placeholder: "Write a comment", maxlength: 500, "aria-label": "Write a comment" });
    const form = h("form.comment-form", {}, input, h("button.btn.btn-primary", { type: "submit" }, "Reply"));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      const restore = setBusy(form.querySelector("[type=submit]"), "Sending");
      try {
        appendComment(postId, await addComment(postId, content));
        input.value = "";
      } catch (error) {
        toast(errorMessage(error), "error");
      } finally {
        restore();
        input.focus();
      }
    });
    return form;
  }

  async function toggle(postEl, postId) {
    const existing = $(".comments", postEl);
    if (existing) {
      existing.hidden = !existing.hidden;
      return;
    }
    const items = h("div.stack", { style: { gap: "12px" } }, skeletonRows(2));
    const footer = getUser()
      ? replyForm(postId)
      : h("button.btn.btn-secondary.btn-sm", { type: "button", onclick: () => openAuthDialog("login") }, "Log in to comment");
    postEl.append(h("div.comments", {}, items, footer));

    try {
      const comments = await getComments(postId);
      replaceChildren(items, comments.length ? comments.map(item) : h("p.muted.small", { dataset: { empty: "" } }, "No comments yet."));
    } catch (error) {
      replaceChildren(items, h("p.form-error", {}, errorMessage(error)));
    }
  }

  function appendComment(postId, comment) {
    const postEl = list.querySelector(`[data-post-id="${postId}"]`);
    if (!postEl || postEl.querySelector(`[data-comment-id="${comment.id}"]`)) return;
    const items = postEl.querySelector(".comments .stack");
    if (items) {
      items.querySelector("[data-empty]")?.remove();
      items.append(item(comment));
    }
    bumpCount(postEl, "comments", 1);
  }

  function removeComment(commentId) {
    const el = list.querySelector(`[data-comment-id="${commentId}"]`);
    if (!el) return;
    bumpCount(el.closest("[data-post-id]"), "comments", -1);
    el.remove();
  }

  // A comment from someone else: append it if the thread is open, else just count it.
  async function receive(row) {
    const postEl = list.querySelector(`[data-post-id="${row.post_id}"]`);
    if (!postEl) return;
    if (!postEl.querySelector(".comments:not([hidden]) .stack")) {
      bumpCount(postEl, "comments", 1);
      return;
    }
    // Fetch again to get the author profile joined.
    const comment = (await getComments(row.post_id)).find((c) => c.id === row.id);
    if (comment) appendComment(row.post_id, comment);
  }

  return { toggle, receive, remove: removeComment };
}
