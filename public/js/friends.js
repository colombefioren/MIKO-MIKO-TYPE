import { supabase } from "./database.js";

const buttons = document.querySelectorAll(".button-links");
const buttonTexts = document.querySelectorAll(".button-text");
const buttonIcons = document.querySelectorAll(".button-icon");
const highlight = document.getElementById("focus-highlight");

//Time config
const MOVE_DURATION = 200;
const COLOR_DELAY = 90;
const COLOR_DURATION = 200;

//The hightlight movement
function moveHighlightTo(index) {
  const button = buttons[index];
  const offset = button.offsetTop;

  buttons.forEach((btn) => btn.classList.remove("active"));
  buttonTexts.forEach((text) => text.classList.remove("text-white"));
  buttonIcons.forEach((icon) => icon.classList.remove("text-frost"));

  highlight.style.transform = `translateY(${offset}px)`;

  setTimeout(() => {
    button.classList.add("active");
    buttonTexts[index].classList.add("text-white");
    buttonIcons[index].classList.add("text-frost");
  }, COLOR_DELAY);
}

//Move the highlight according to the clicked button
buttons.forEach((button, index) => {
  button.addEventListener("click", () => {
    moveHighlightTo(index);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  highlight.style.transition = "none";
  moveHighlightTo(2);

  buttons[2].classList.add("active");
  buttonTexts[2].classList.add("text-white");
  buttonIcons[2].classList.add("text-frost");

  setTimeout(() => {
    highlight.style.transition = `transform ${MOVE_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
  }, 10);
});
document.addEventListener("DOMContentLoaded", function () {
  const chevron = document.querySelector(".chevron");
  const nav = document.querySelector("nav");
  const linkContainer = document.querySelector(".link-container");

  linkContainer.classList.toggle("px-7");
  chevron.addEventListener("click", function () {
    nav.classList.toggle("collapsed");
    linkContainer.classList.toggle("px-7");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("chat-text").classList.remove("text-dusk");
  document.getElementById("chat-icon").classList.remove("text-frost");
  document.getElementById("chat-text").classList.add("text-blaze");
  document.getElementById("chat-icon").classList.add("text-blaze");
  document.getElementById("indicator").style.transform = "translateX(0%)";

  // Hide all content except chat
  document.getElementById("messages-content").classList.add("hidden");
  document.getElementById("friends-content").classList.add("hidden");
});

//to switch the content according to the tab, doesnt work yet tho

function switchTab(tabName, position) {
  document.querySelectorAll('[id$="-text"]').forEach((el) => {
    el.classList.remove("text-blaze");
    el.classList.add("text-dusk");
  });
  document.querySelectorAll('[id$="-icon"]').forEach((el) => {
    el.classList.remove("text-blaze");
    el.classList.add("text-frost");
  });

  document.getElementById(tabName + "-text").classList.remove("text-dusk");
  document.getElementById(tabName + "-text").classList.add("text-blaze");

  if (document.getElementById(tabName + "-icon")) {
    document.getElementById(tabName + "-icon").classList.remove("text-frost");
    document.getElementById(tabName + "-icon").classList.add("text-blaze");
  }

  document.querySelectorAll(".content").forEach((content) => {
    content.classList.add("hidden");
    content.classList.remove("active");
  });

  document.getElementById(tabName + "-content").classList.remove("hidden");
  document.getElementById(tabName + "-content").classList.add("active");

  const indicator = document.getElementById("indicator");
  indicator.style.transform = `translateX(${position * 100}%)`;
}
// Comments functionality, for the static and doesnt work too
function toggleComments(sectionId) {
  const commentsSection = document.getElementById(sectionId);
  commentsSection.classList.toggle("hidden");
}

function checkCommentInput(input) {
  const sendBtn = input.nextElementSibling;
  if (input.value.trim().length > 0) {
    sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    sendBtn.classList.add("hover:text-blaze");
    sendBtn.disabled = false;
  } else {
    sendBtn.classList.add("opacity-50", "cursor-not-allowed");
    sendBtn.classList.remove("hover:text-blaze");
    sendBtn.disabled = true;
  }
}

// function postComment(inputId, sectionId) {
//   const input = document.getElementById(inputId);
//   const commentText = input.value.trim();
//   if (commentText) {
//     // for the backend
//     console.log("Posting comment:", commentText);

//     // simulation
//     const commentsContainer = document.querySelector(
//       `#${sectionId} > div:first-child`
//     );
//     const newComment = document.createElement("div");
//     newComment.className = "flex gap-3 mb-3";
//     newComment.innerHTML = `
//       <img
//         src="${
//           user.user_metadata?.avatar_url ||
//           "../public/assets/images/blank-profile.png"
//         }"
//         alt="You"
//         class="w-10 h-10 rounded-full object-cover"
//       >
//       <div class="w-fit bg-lightabyss rounded-2xl p-3">
//         <div class="text-slate-200 font-bold text-sm">Coco Thebest</div>
//         <p class="text-azure text-sm">${commentText}</p>
//         <div class="flex items-center gap-3 mt-1">
//           <span class="text-dusk text-xs">Just now</span>
//           <button class="text-dusk text-xs hover:text-slate-200">Like</button>
//           <button class="text-dusk text-xs hover:text-slate-200">Reply</button>
//         </div>
//       </div>
//     `;
//     commentsContainer.appendChild(newComment);

//     input.value = "";
//     checkCommentInput(input);
//   }
// }

// //all comment inputs
// document.querySelectorAll('[id^="comment-input-"]').forEach((input) => {
//   input.addEventListener("keypress", function (e) {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       const inputId = this.id;
//       const sectionId = this.closest('[id^="comments-section-"]').id;
//       postComment(inputId, sectionId);
//     }
//   });
// });

function toggleChatConversation() {
  const chat = document.getElementById("chat-conversation");
  chat.classList.toggle("hidden");
  chat.classList.toggle("flex");
  chat.classList.toggle("translate-y-full");
  chat.classList.toggle("translate-y-0");
}

function openChatConversation(contactName) {
  const chat = document.getElementById("chat-conversation");
  document.getElementById("chat-contact-name").textContent = contactName;

  // Show the chat if hidden
  if (chat.classList.contains("hidden")) {
    chat.classList.remove("hidden");
    chat.classList.add("flex");
    setTimeout(() => {
      chat.classList.remove("translate-y-full");
      chat.classList.add("translate-y-0");
    }, 10);
  }
}

function sendChatMessage() {
  const input = document.getElementById("chat-message-input");
  const message = input.value.trim();
  if (message) {
    const messagesContainer = document.getElementById("chat-messages");

    // Create sent message
    const sentMsg = document.createElement("div");
    sentMsg.className = "mb-4 flex flex-col items-end";
    sentMsg.innerHTML = `
      <div class="text-azure text-xs">You</div>
      <div class="mt-1 px-4 py-2 bg-blaze rounded-xl text-white max-w-[80%]">${message}</div>
    `;
    messagesContainer.appendChild(sentMsg);

    input.value = "";

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulation reply after 1 second, this is not with backend whatsoever
    setTimeout(() => {
      const contactName =
        document.getElementById("chat-contact-name").textContent;
      const replyMsg = document.createElement("div");
      replyMsg.className = "mb-4 flex flex-col items-start";
      replyMsg.innerHTML = `
        <div class="text-azure text-xs">${contactName}</div>
        <div class="mt-1 px-4 py-2 bg-lightabyss rounded-xl text-slate-200 max-w-[80%]">
          Thanks for your message! I'll get back to you soon.
        </div>
      `;
      messagesContainer.appendChild(replyMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
  }
}

document
  .getElementById("chat-message-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });

let user;

import { getCurrentUser } from "./auth.js";
import {
  createPost,
  getPosts,
  createComment,
  getComments,
  toggleLike,
} from "./socials.js";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    user = await getCurrentUser();
    if (!user) {
      // redirect to typing main page
      window.location.href = "../index.html";
      return;
    }

    //the user avatar
    document.getElementById("current-user-avatar").src =
      user.user_metadata?.avatar_url ||
      "../public/assets/images/blank-picture.png";

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
              user.user_metadata?.avatar_url ||
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
