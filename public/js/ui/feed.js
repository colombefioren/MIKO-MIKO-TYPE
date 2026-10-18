// Community feed: composer, posts, likes and comments.
import { $, append, h, icon, emptyState, replaceChildren, setBusy, skeletonRows } from "../lib/dom.js";
import { avatar } from "../lib/avatar.js";
import { round, timeAgo } from "../lib/format.js";
import { errorMessage, toast } from "../lib/toast.js";
import { profileUrl } from "./shell.js";
import { openAuthDialog } from "./authDialog.js";
import { confirmAction } from "./confirm.js";
import { MAX_POST_IMAGE_BYTES, validateImage } from "../services/profiles.js";
import { isStorageUrl } from "../lib/supabase.js";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getComments,
  getFeed,
  getPost,
  PAGE_SIZE,
  setLike,
} from "../services/social.js";

const MAX_POST_LENGTH = 1000;

// Text with #hashtags highlighted, built from text nodes so user content is never parsed as HTML.
function richText(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(/#[\p{L}\p{N}_]{1,30}/gu)) {
    parts.push(text.slice(last, match.index), h("span.hashtag", {}, match[0]));
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

function resultCard(result) {
  return h(
    "dl.result-card",
    {},
    h("div", {}, h("dt", {}, "wpm"), h("dd.result-card-wpm", {}, round(result.wpm))),
    h("div", {}, h("dt", {}, "Accuracy"), h("dd", {}, `${round(result.accuracy, 1)}%`)),
    h("div", {}, h("dt", {}, "Raw"), h("dd", {}, round(result.raw_wpm))),
    h("div", {}, h("dt", {}, "Test"), h("dd", {}, `${result.difficulty}, ${result.word_count}w`))
  );
}

export function createFeed({ composerSlot, list, loadMoreButton, newPostsButton }) {
  let user = null;
  let oldestId = null;
  const pending = new Set();

  // ---------------------------------------------------------------- Comments

  function commentItem(comment) {
    const mine = comment.user_id === user?.id;
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
          mine && h("button.comment-delete", { type: "button", onclick: remove }, "Delete")
        ),
        h("p", {}, comment.content)
      )
    );
  }

  async function openComments(postEl, postId) {
    let section = $(".comments", postEl);
    if (section) {
      section.hidden = !section.hidden;
      return;
    }
    const items = h("div.stack", { style: { gap: "12px" } }, skeletonRows(2));
    section = h("div.comments", {}, items);
    postEl.append(section);

    if (user) {
      const input = h("input.input", { placeholder: "Write a comment", maxlength: 500, "aria-label": "Write a comment" });
      const form = h("form.comment-form", {}, input, h("button.btn.btn-primary", { type: "submit" }, "Reply"));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = input.value.trim();
        if (!content) return;
        const restore = setBusy(form.querySelector("[type=submit]"), "Sending");
        try {
          const comment = await addComment(postId, content);
          input.value = "";
          appendComment(postId, comment);
        } catch (error) {
          toast(errorMessage(error), "error");
        } finally {
          restore();
          input.focus();
        }
      });
      section.append(form);
    } else {
      section.append(h("button.btn.btn-secondary.btn-sm", { type: "button", onclick: () => openAuthDialog("login") }, "Log in to comment"));
    }

    try {
      const comments = await getComments(postId);
      replaceChildren(items, comments.length ? comments.map(commentItem) : h("p.muted.small", { dataset: { empty: "" } }, "No comments yet."));
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
      items.append(commentItem(comment));
    }
    bumpCount(postEl, "comments", 1);
  }

  function removeComment(commentId) {
    const el = list.querySelector(`[data-comment-id="${commentId}"]`);
    if (!el) return;
    bumpCount(el.closest("[data-post-id]"), "comments", -1);
    el.remove();
  }

  function bumpCount(postEl, kind, delta) {
    const counter = postEl?.querySelector(`[data-count="${kind}"]`);
    if (!counter) return;
    counter.textContent = Math.max(0, Number(counter.textContent) + delta);
  }

  // ---------------------------------------------------------------- Posts

  function likeButton(post) {
    const button = h(
      "button.post-action",
      { type: "button", "aria-pressed": String(post.likedByMe), "aria-label": "Like" },
      h("i", { class: post.likedByMe ? "ph-fill ph-heart" : "ph ph-heart", "aria-hidden": "true" }),
      h("span", { dataset: { count: "likes" } }, post.likeCount)
    );
    button.addEventListener("click", async () => {
      if (!user) return openAuthDialog("login");
      const liked = button.getAttribute("aria-pressed") !== "true";
      // Optimistic update, rolled back if the request fails.
      const sync = (state) => {
        button.setAttribute("aria-pressed", String(state));
        button.querySelector("i").className = state ? "ph-fill ph-heart" : "ph ph-heart";
      };
      sync(liked);
      bumpCount(button.closest("[data-post-id]"), "likes", liked ? 1 : -1);
      button.disabled = true;
      try {
        await setLike(post.id, user.id, liked);
      } catch (error) {
        sync(!liked);
        bumpCount(button.closest("[data-post-id]"), "likes", liked ? -1 : 1);
        toast(errorMessage(error), "error");
      } finally {
        button.disabled = false;
      }
    });
    return button;
  }

  function postCard(post) {
    const mine = post.user_id === user?.id;
    const el = h("article.card.post", { dataset: { postId: post.id }, id: `post-${post.id}` });

    const remove = async () => {
      if (!(await confirmAction({ title: "Delete this post?", body: "Comments and likes are deleted with it.", confirmLabel: "Delete", danger: true }))) return;
      try {
        await deletePost(post.id);
        el.remove();
        toast("Post deleted.", "info");
      } catch (error) {
        toast(errorMessage(error), "error");
      }
    };

    append(
      el,
      h(
        "header.post-head",
        {},
        avatar(post.author, 42),
        h(
          "div.post-author",
          {},
          h("a.user-link", { href: profileUrl(post.user_id) }, post.author?.username ?? "Unknown"),
          h("time.post-time", { datetime: post.created_at, title: new Date(post.created_at).toLocaleString() }, timeAgo(post.created_at))
        ),
        mine && h("button.icon-btn", { type: "button", "aria-label": "Delete post", onclick: remove }, icon("trash"))
      ),
      post.content && h("p.post-body", {}, richText(post.content)),
      post.result && resultCard(post.result),
      isStorageUrl(post.image_url) && h("img.post-image", { src: post.image_url, alt: "Image shared with the post", loading: "lazy" }),
      h(
        "div.post-actions",
        {},
        likeButton(post),
        h(
          "button.post-action",
          { type: "button", "aria-label": "Comments", onclick: () => openComments(el, post.id) },
          icon("chat-circle"),
          h("span", { dataset: { count: "comments" } }, post.commentCount)
        )
      )
    );
    return el;
  }

  async function loadPage() {
    const first = oldestId === null;
    if (first) replaceChildren(list, skeletonRows(3, "skeleton-post"));
    loadMoreButton.disabled = true;
    try {
      const posts = await getFeed({ userId: user?.id, beforeId: oldestId });
      if (first) list.replaceChildren();
      list.append(...posts.map(postCard));
      if (posts.length) oldestId = posts[posts.length - 1].id;
      loadMoreButton.hidden = posts.length < PAGE_SIZE;

      if (first && !posts.length) {
        list.append(
          emptyState({ iconName: "newspaper", title: "No posts yet", body: "Share a result from the typing test or write the first post." })
        );
      }
    } catch (error) {
      console.error("Could not load the feed", error);
      if (first) replaceChildren(list, emptyState({ iconName: "warning-circle", title: "Could not load the feed", body: errorMessage(error) }));
      else toast(errorMessage(error), "error");
    } finally {
      loadMoreButton.disabled = false;
      list.setAttribute("aria-busy", "false");
    }
  }

  async function prependPost(postId) {
    if (list.querySelector(`[data-post-id="${postId}"]`)) return;
    const post = await getPost(postId, user?.id);
    if (!post) return;
    list.querySelector(".empty-state")?.remove();
    list.prepend(postCard(post));
  }

  // ---------------------------------------------------------------- Composer

  function composer() {
    if (!user) {
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
      imageFile = null;
      preview.hidden = true;
      preview.querySelector("img")?.src && URL.revokeObjectURL(preview.querySelector("img").src);
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
        pending.add(id);
        textarea.value = "";
        clearImage();
        await prependPost(id);
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

  // ---------------------------------------------------------------- Realtime

  const incoming = new Set();

  function showNewPostsButton() {
    newPostsButton.hidden = incoming.size === 0;
    newPostsButton.textContent = `Show ${incoming.size} new post${incoming.size === 1 ? "" : "s"}`;
  }

  newPostsButton.addEventListener("click", async () => {
    const ids = [...incoming].sort((a, b) => a - b);
    incoming.clear();
    showNewPostsButton();
    for (const id of ids) await prependPost(id);
  });

  function handleChange({ table, eventType, new: row, old }) {
    if (table === "posts" && eventType === "INSERT") {
      if (row.user_id === user?.id || pending.has(row.id)) return;
      incoming.add(row.id);
      showNewPostsButton();
    } else if (table === "posts" && eventType === "DELETE") {
      list.querySelector(`[data-post-id="${old.id}"]`)?.remove();
    } else if (table === "likes") {
      const record = eventType === "DELETE" ? old : row;
      if (record.user_id === user?.id) return;
      bumpCount(list.querySelector(`[data-post-id="${record.post_id}"]`), "likes", eventType === "DELETE" ? -1 : 1);
    } else if (table === "comments" && eventType === "INSERT") {
      if (row.user_id === user?.id) return;
      const postEl = list.querySelector(`[data-post-id="${row.post_id}"]`);
      if (!postEl) return;
      const open = postEl.querySelector(".comments:not([hidden]) .stack");
      if (open) {
        // Fetch with the author profile joined.
        getComments(row.post_id).then((comments) => {
          const comment = comments.find((c) => c.id === row.id);
          if (comment) appendComment(row.post_id, comment);
        });
      } else bumpCount(postEl, "comments", 1);
    } else if (table === "comments" && eventType === "DELETE") {
      removeComment(old.id);
    }
  }

  loadMoreButton.addEventListener("click", loadPage);

  return {
    setUser(next) {
      user = next;
      replaceChildren(composerSlot, composer());
      oldestId = null;
      incoming.clear();
      showNewPostsButton();
      return loadPage();
    },
    handleChange,
  };
}
