import { supabase } from "./database.js";

import { getCurrentUser } from "./auth.js";
import {
  createPost,
  getPosts,
  createComment,
  getComments,
  toggleLike,
} from "./socials.js";

let user;
// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    user = await getCurrentUser();
    const postForm = document.getElementById("post-creation-form");
    if (!user) {
      postForm.classList.add("hidden");
    } else {
      postForm.classList.remove("hidden");
      document.getElementById("current-user-avatar").src =
        user.user_metadata?.avatar_url ||
        "../public/assets/images/blank-profile.png";
    }
    console.log("This is not running!");
    // Load every existing posts
    await loadPosts();

    // real time updates
    setupRealtime();
  } catch (error) {
    console.error("Initialization error:", error);
  }
});
// Post creation
document
  .getElementById("create-post-btn")
  .addEventListener("click", async () => {
    const content = document.getElementById("post-content-input").value.trim();
    if (!content) return;

    try {
      await createPost(content);
      document.getElementById("post-content-input").value = "";
      await loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    }
  });

// Load posts function
async function loadPosts() {
  try {
    const posts = await getPosts();
    renderPosts(posts);
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

// Render posts
function renderPosts(posts) {
  const postsContainer = document.querySelector(".posts-container"); // Add this class to your main container
  postsContainer.innerHTML = "";

  posts.forEach((post) => {
    const postElement = document.createElement("div");
    postElement.className =
      "bg-midnight border border-lightabyss rounded-3xl p-6 mb-6 w-full";
    postElement.innerHTML = `
      <!-- Post header with user info -->
      <div class="flex items-center justify-between mb-4 w-full">
        <div class="flex items-center gap-3">
          <img
            src="${
              posts.profiles?.avatar_url ||
              "../public/assets/images/blank-profile.png"
            }"
            alt="Profile"
            class="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <div class="text-slate-200 font-bold">${
              post.profiles.username
            }</div>
            <div class="text-azure text-sm">${formatDate(post.created_at)}</div>
          </div>
        </div>
        <button class="text-dusk hover:text-slate-200">
          <i class="fas fa-ellipsis-h"></i>
        </button>
      </div>

      <!-- Post content -->
      <div class="mb-4">
        <p class="text-slate-200 text-lg">${post.content}</p>
        ${
          post.wpm
            ? `<p class="text-azure mt-2">WPM: ${post.wpm} | Accuracy: ${post.accuracy}%</p>`
            : ""
        }
      </div>

      <!-- Post stats -->
      <div class="flex items-center justify-between text-dusk text-sm mb-4">
        <div class="flex items-center gap-2">
          <i class="fas fa-heart ${
            post.likes[0].count > 0 ? "text-blaze" : ""
          }"></i>
          <span>${post.likes[0].count} likes</span>
        </div>
        <div>
          <span>${post.comments[0].count} comments</span>
        </div>
      </div>

      <!-- Post actions -->
      <div class="flex border-t border-b border-lightabyss py-2 mb-4">
        <button class="flex-1 flex items-center justify-center gap-2 text-dusk hover:text-slate-200 py-2 like-btn" 
                data-post-id="${post.id}">
          <i class="far fa-heart"></i>
          <span>Like</span>
        </button>
        <button class="flex-1 flex items-center justify-center gap-2 text-dusk hover:text-slate-200 py-2 comment-toggle-btn"
                data-post-id="${post.id}">
          <i class="fa-solid fa-comment"></i>
          <span>Comment</span>
        </button>
        <button class="flex-1 flex items-center justify-center gap-2 text-dusk hover:text-slate-200 py-2 share-btn">
          <i class="fas fa-share"></i>
          <span>Share</span>
        </button>
      </div>

      <!-- Comments section (initially hidden) -->
      <div class="hidden comments-section" id="comments-section-${post.id}">
        <div class="comments-container mb-4"></div>
        
        <!-- Comment input -->
        <div class="flex gap-3 items-center mt-4">
          <img
            src="${
              user?.user_metadata?.avatar_url ||
              "../public/assets/images/blank-profile.png"
            }"
            alt="You"
            class="w-10 h-10 rounded-full object-cover"
          />
          <div class="flex justify-between items-center w-full">
            <input
              type="text"
              placeholder="Write a comment..."
              class="bg-abyss border w-[96%] focus:outline-none border-lightabyss rounded-4xl py-3 px-4 text-slate-200 text-sm"
              id="comment-input-${post.id}"
              data-post-id="${post.id}"
            />
            <button class="text-frost ml-2 comment-submit-btn" data-post-id="${
              post.id
            }">
              <i class="fas fa-paper-plane text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    postsContainer.appendChild(postElement);
  });

  setupPostInteractions();
}

// data transformation for the comments and such
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

// like and comments count
function setupPostInteractions() {
  // Like buttons
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.dataset.postId;
      try {
        const result = await toggleLike(postId);
        const icon = btn.querySelector("i");
        if (result.liked) {
          icon.classList.remove("far");
          icon.classList.add("fas", "text-blaze");
        } else {
          icon.classList.remove("fas", "text-blaze");
          icon.classList.add("far");
        }
        // Update like count
        const countElement = btn.closest(".flex").querySelector("span");
        const currentCount = parseInt(countElement.textContent.split(" ")[0]);
        countElement.textContent = `${
          result.liked ? currentCount + 1 : currentCount - 1
        } likes`;
      } catch (error) {
        console.error("Error toggling like:", error);
      }
    });
  });

  // Comment toggle buttons
  document.querySelectorAll(".comment-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.dataset.postId;
      const commentsSection = document.getElementById(
        `comments-section-${postId}`
      );

      commentsSection.classList.toggle("hidden");

      if (
        !commentsSection.classList.contains("hidden") &&
        commentsSection.querySelector(".comments-container").children.length ===
          0
      ) {
        try {
          const comments = await getComments(postId);
          renderComments(postId, comments);
        } catch (error) {
          console.error("Error loading comments:", error);
        }
      }
    });
  });

  document.querySelectorAll(".comment-submit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.dataset.postId;
      const input = document.getElementById(`comment-input-${postId}`);
      const content = input.value.trim();

      if (!content) return;

      try {
        await createComment(postId, content);
        input.value = "";
        const comments = await getComments(postId);
        renderComments(postId, comments);
      } catch (error) {
        console.error("Error creating comment:", error);
      }
    });
  });

  // enter when commenting
  document.querySelectorAll('[id^="comment-input-"]').forEach((input) => {
    input.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const postId = input.dataset.postId;
        const content = input.value.trim();

        if (!content) return;

        try {
          await createComment(postId, content);
          input.value = "";

          const comments = await getComments(postId);
          renderComments(postId, comments);
        } catch (error) {
          console.error("Error creating comment:", error);
        }
      }
    });
  });
}

// Render comments
function renderComments(postId, comments) {
  const container = document
    .getElementById(`comments-section-${postId}`)
    .querySelector(".comments-container");
  container.innerHTML = "";

  comments.forEach((comment) => {
    const commentElement = document.createElement("div");
    commentElement.className = "flex gap-3 mb-3";
    commentElement.innerHTML = `
      <img
        src="${
          comment.profiles?.avatar_url ||
          "../public/assets/images/blank-profile.png"
        }"
        alt="Commenter"
        class="w-10 h-10 rounded-full object-cover"
      />
      <div class="w-fit bg-lightabyss rounded-2xl p-3">
        <div class="text-slate-200 font-bold text-sm">${
          comment.profiles?.username || "Unknown User"
        }</div>
        <p class="text-azure text-sm">${comment.content}</p>
        <div class="flex items-center gap-3 mt-1">
          <span class="text-dusk text-xs">${formatDate(
            comment.created_at
          )}</span>
        </div>
      </div>
    `;
    container.appendChild(commentElement);
  });
}
//real-time updates
function setupRealtime() {
  const postsChannel = supabase
    .channel("posts_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      () => loadPosts()
    )
    .subscribe();

  const commentsChannel = supabase
    .channel("comments_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments" },
      (payload) => {
        const commentsSection = document.getElementById(
          `comments-section-${payload.new.post_id}`
        );
        if (commentsSection && !commentsSection.classList.contains("hidden")) {
          getComments(payload.new.post_id).then((comments) => {
            renderComments(payload.new.post_id, comments);
          });
        }
      }
    )
    .subscribe();

  const likesChannel = supabase
    .channel("likes_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "likes" },
      () => loadPosts()
    )
    .subscribe();
}
