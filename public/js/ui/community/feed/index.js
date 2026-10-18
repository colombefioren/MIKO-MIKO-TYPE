// Community feed: paging, new posts arriving live, likes and comments counted live.
import { emptyState, replaceChildren, skeletonRows } from "../../../lib/dom.js";
import { errorMessage, toast } from "../../../lib/toast.js";
import { getFeed, getPost, PAGE_SIZE } from "../../../services/social.js";
import { createComments } from "./comments.js";
import { composer } from "./composer.js";
import { bumpCount, postCard } from "./post.js";

export function createFeed({ composerSlot, list, loadMoreButton, newPostsButton }) {
  let user = null;
  let oldestId = null;
  const ownPosts = new Set();
  const incoming = new Set();
  const comments = createComments({ list, getUser: () => user });

  const card = (post) => postCard(post, { user, onToggleComments: comments.toggle });

  async function loadPage() {
    const first = oldestId === null;
    if (first) replaceChildren(list, skeletonRows(3, "skeleton-post"));
    loadMoreButton.disabled = true;
    try {
      const posts = await getFeed({ userId: user?.id, beforeId: oldestId });
      if (first) list.replaceChildren();
      list.append(...posts.map(card));
      if (posts.length) oldestId = posts[posts.length - 1].id;
      loadMoreButton.hidden = posts.length < PAGE_SIZE;
      if (first && !posts.length) {
        list.append(emptyState({ iconName: "newspaper", title: "No posts yet", body: "Share a result from the typing test or write the first post." }));
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
    list.prepend(card(post));
  }

  // New posts from others wait behind a button so the feed never jumps while reading.
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
  loadMoreButton.addEventListener("click", loadPage);

  function handleChange({ table, eventType, new: row, old }) {
    const mine = (record) => record.user_id === user?.id;
    if (table === "posts" && eventType === "INSERT") {
      if (mine(row) || ownPosts.has(row.id)) return;
      incoming.add(row.id);
      showNewPostsButton();
    } else if (table === "posts" && eventType === "DELETE") {
      list.querySelector(`[data-post-id="${old.id}"]`)?.remove();
    } else if (table === "likes") {
      const record = eventType === "DELETE" ? old : row;
      if (!mine(record)) bumpCount(list.querySelector(`[data-post-id="${record.post_id}"]`), "likes", eventType === "DELETE" ? -1 : 1);
    } else if (table === "comments" && eventType === "INSERT") {
      if (!mine(row)) comments.receive(row);
    } else if (table === "comments" && eventType === "DELETE") {
      comments.remove(old.id);
    }
  }

  return {
    setUser(next) {
      user = next;
      const onPosted = async (id) => {
        ownPosts.add(id);
        await prependPost(id);
      };
      replaceChildren(composerSlot, composer({ user, onPosted }));
      oldestId = null;
      incoming.clear();
      showNewPostsButton();
      return loadPage();
    },
    handleChange,
  };
}
