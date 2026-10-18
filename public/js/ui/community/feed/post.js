// One post in the feed: author, text with #hashtags, shared result, image, like and comment buttons.
import { append, h, icon } from "../../../lib/dom.js";
import { avatar } from "../../../lib/avatar.js";
import { round, timeAgo } from "../../../lib/format.js";
import { profileUrl } from "../../../lib/routes.js";
import { isStorageUrl } from "../../../lib/storageUrl.js";
import { errorMessage, toast } from "../../../lib/toast.js";
import { deletePost, setLike } from "../../../services/social.js";
import { openAuthDialog } from "../../auth/dialog.js";
import { confirmAction } from "../../common/confirm.js";

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

// Adds `delta` to the like or comment counter of a post element.
export function bumpCount(postEl, kind, delta) {
  const counter = postEl?.querySelector(`[data-count="${kind}"]`);
  if (counter) counter.textContent = Math.max(0, Number(counter.textContent) + delta);
}

function likeButton(post, user) {
  const heart = h("i", { class: post.likedByMe ? "ph-fill ph-heart" : "ph ph-heart", "aria-hidden": "true" });
  const button = h(
    "button.post-action",
    { type: "button", "aria-pressed": String(post.likedByMe), "aria-label": "Like" },
    heart,
    h("span", { dataset: { count: "likes" } }, post.likeCount)
  );
  const show = (liked) => {
    button.setAttribute("aria-pressed", String(liked));
    heart.className = liked ? "ph-fill ph-heart" : "ph ph-heart";
    bumpCount(button.closest("[data-post-id]"), "likes", liked ? 1 : -1);
  };
  button.addEventListener("click", async () => {
    if (!user) return openAuthDialog("login");
    const liked = button.getAttribute("aria-pressed") !== "true";
    // Optimistic update, rolled back if the request fails.
    show(liked);
    button.disabled = true;
    try {
      await setLike(post.id, user.id, liked);
    } catch (error) {
      show(!liked);
      toast(errorMessage(error), "error");
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

export function postCard(post, { user, onToggleComments }) {
  const el = h("article.card.post", { dataset: { postId: post.id }, id: `post-${post.id}` });

  const remove = async () => {
    const ok = await confirmAction({ title: "Delete this post?", body: "Comments and likes are deleted with it.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await deletePost(post.id);
      el.remove();
      toast("Post deleted.", "info");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return append(
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
      post.user_id === user?.id && h("button.icon-btn", { type: "button", "aria-label": "Delete post", onclick: remove }, icon("trash"))
    ),
    post.content && h("p.post-body", {}, richText(post.content)),
    post.result && resultCard(post.result),
    isStorageUrl(post.image_url) && h("img.post-image", { src: post.image_url, alt: "Image shared with the post", loading: "lazy" }),
    h(
      "div.post-actions",
      {},
      likeButton(post, user),
      h(
        "button.post-action",
        { type: "button", "aria-label": "Comments", onclick: () => onToggleComments(el, post.id) },
        icon("chat-circle"),
        h("span", { dataset: { count: "comments" } }, post.commentCount)
      )
    )
  );
}
