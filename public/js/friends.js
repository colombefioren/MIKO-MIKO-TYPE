import { getCurrentUser } from "./auth.js";
import { supabase } from "./database.js";
import { createChat, openChatConversation } from "./chats.js";
import { showNotification, showLoading, hideLoading } from "./utils.js";

const buttons = document.querySelectorAll(".button-links");
const buttonTexts = document.querySelectorAll(".button-text");
const buttonIcons = document.querySelectorAll(".button-icon");
const highlight = document.getElementById("focus-highlight");

// Time config
const MOVE_DURATION = 200;
const COLOR_DELAY = 90;
const COLOR_DURATION = 200;

// The highlight movement
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

// Move the highlight according to the clicked button
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

// to switch the content according to the tab
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

// initialize the app
let currentUser = null;

// search all users
async function searchUsers(searchTerm) {
  try {
    showLoading("#search-results-list");
    const { data: users, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${searchTerm}%`)
      .neq("id", currentUser.id) // exclude current user
      .limit(10);

    if (error) throw error;
    return users || [];
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  } finally {
    hideLoading("#search-results-list");
  }
}

// check friendship status
async function getFriendshipStatus(otherUserId) {
  try {
    const { data: friendship, error } = await supabase
      .from("friends")
      .select("*")
      .or(
        `and(user1_id.eq.${currentUser.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUser.id})`
      )
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return friendship || null;
  } catch (error) {
    console.error("Error checking friendship:", error);
    return null;
  }
}

// send friend request
async function sendFriendRequest(receiverId) {
  try {
    const { error } = await supabase
      .from("friends")
      .insert([
        { user1_id: currentUser.id, user2_id: receiverId, status: "pending" },
      ]);

    if (error) throw error;

    // send notification
    await supabase.from("notifications").insert([
      {
        sender_id: currentUser.id,
        recipient_id: receiverId,
        type: "friend_request",
        title: "New Friend Request",
        content: `${
          currentUser.user_metadata.username || currentUser.email
        } sent you a friend request`,
      },
    ]);

    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return false;
  }
}

//remove friend
async function removeFriend(friendshipId) {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", friendshipId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing friend:", error);
    return false;
  }
}

async function renderSearchResults(users) {
  const container = document.getElementById("friends-list-container");

  let searchResultsSection = document.getElementById("search-results-section");
  if (!searchResultsSection) {
    searchResultsSection = document.createElement("div");
    searchResultsSection.id = "search-results-section";
    searchResultsSection.innerHTML = `
      <div class="text-slate-200 font-bold mb-3">
        Search Results
      </div>
      <div class="flex flex-col gap-3" id="search-results-list"></div>
    `;
    container.prepend(searchResultsSection);
  }

  const resultsList = document.getElementById("search-results-list");
  resultsList.innerHTML = "";

  if (users.length === 0) {
    resultsList.innerHTML = `
      <div class="text-center py-4 text-dusk">
        No users found
      </div>
    `;
    return;
  }

  for (const user of users) {
    const friendship = await getFriendshipStatus(user.id);
    const isFriend = friendship && friendship.status === "accepted";
    const isPending = friendship && friendship.status === "pending";
    const isIncomingRequest =
      isPending && friendship.user2_id === currentUser.id;

    const userElement = document.createElement("div");
    userElement.className =
      "bg-midnight border border-lightabyss w-full rounded-3xl py-3 px-6 h-20 flex items-center justify-between";

    userElement.innerHTML = `
      <div class="flex gap-3 h-full items-center">
        <img src="${
          user.avatar_url || "../public/assets/images/blank-profile.png"
        }"
             alt="Profile Pic" class="rounded-full w-12 h-12 object-cover">
        <div class="flex flex-col justify-between h-[85%]">
          <div class="text-slate-200 text-[14px]">${user.username}</div>
          <div class="text-azure text-[12px]">
            ${
              isFriend
                ? "Friend"
                : isPending
                ? isIncomingRequest
                  ? "Request received"
                  : "Request sent"
                : "Not friends"
            }
          </div>
        </div>
      </div>
      <div class="flex gap-3">
        <button class="message-user bg-lightmidnight cursor-pointer rounded-2xl h-12 w-12 flex items-center justify-center"
                data-user-id="${user.id}">
          <i class="fa-regular fa-comment-dots text-2xl text-frost"></i>
        </button>
        ${
          isFriend
            ? `<button class="remove-friend bg-blaze cursor-pointer rounded-2xl h-12 w-12 flex items-center justify-center"
                data-friendship-id="${friendship.id}">
                <i class="fas fa-user-minus text-xl text-white"></i>
              </button>`
            : isPending
            ? isIncomingRequest
              ? `<div class="flex gap-2">
                  <button class="accept-request bg-green-400 cursor-pointer rounded-2xl h-10 w-10 flex items-center justify-center"
                          data-request-id="${friendship.id}">
                    <i class="fa-solid fa-check font-bold text-xl text-midnight"></i>
                  </button>
                  <button class="reject-request bg-blaze cursor-pointer rounded-2xl h-10 w-10 flex items-center justify-center"
                          data-request-id="${friendship.id}">
                    <i class="fa-solid fa-xmark font-bold text-xl text-midnight"></i>
                  </button>
                </div>`
              : `<button class="cancel-request bg-dusk cursor-pointer rounded-2xl h-12 w-12 flex items-center justify-center"
                  data-request-id="${friendship.id}">
                  <i class="fas fa-clock text-xl text-white"></i>
                </button>`
            : `<button class="add-friend bg-blaze cursor-pointer rounded-2xl h-12 w-12 flex items-center justify-center"
                data-user-id="${user.id}">
                <i class="fas fa-user-plus text-xl text-white"></i>
              </button>`
        }
      </div>
    `;

    resultsList.appendChild(userElement);
  }
}

async function loadFriends() {
  try {
    showLoading("#friends-list-container");
    // get friend requests
    const { data: friendRequests, error: requestsError } = await supabase
      .from("friends")
      .select(
        `
        *,
        friend:user1_id (id, username, avatar_url)
      `
      )
      .eq("user2_id", currentUser.id)
      .eq("status", "pending");

    if (requestsError) throw requestsError;

    // get accepted friends (both directions)
    const { data: friends1, error: friends1Error } = await supabase
      .from("friends")
      .select(
        `
        *,
        friend:user2_id (id, username, avatar_url)
      `
      )
      .eq("user1_id", currentUser.id)
      .eq("status", "accepted");

    const { data: friends2, error: friends2Error } = await supabase
      .from("friends")
      .select(
        `
        *,
        friend:user1_id (id, username, avatar_url)
      `
      )
      .eq("user2_id", currentUser.id)
      .eq("status", "accepted");

    if (friends1Error || friends2Error) throw friends1Error || friends2Error;

    const allFriends = [...(friends1 || []), ...(friends2 || [])];

    renderFriends({
      friendRequests: friendRequests || [],
      friends: allFriends,
    });
  } catch (error) {
    console.error("Error loading friends:", error);
  } finally {
    hideLoading("#friends-list-container");
  }
}

function renderFriends({ friendRequests, friends }) {
  const container = document.getElementById("friends-list-container");

  const existingSections = container.querySelectorAll(
    ":scope > div:not(#search-results-section)"
  );
  existingSections.forEach((section) => section.remove());

  container.innerHTML = `
    <div class="space-y-4">
      ${Array(5)
        .fill()
        .map(
          () => `
        <div class="bg-midnight border border-lightabyss rounded-3xl p-6 h-20 flex items-center">
          <div class="flex items-center gap-3 w-full">
            <div class="skeleton w-12 h-12 rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="skeleton h-4 w-3/4 rounded"></div>
              <div class="skeleton h-3 w-1/2 rounded"></div>
            </div>
            <div class="skeleton w-12 h-12 rounded-xl"></div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  setTimeout(() => {
    container.innerHTML = "";
    if (friendRequests.length > 0) {
      const requestsSection = document.createElement("div");
      requestsSection.innerHTML = `
        <div class="text-slate-200 font-bold mb-3">
          Friend Requests (${friendRequests.length})
        </div>
        <div class="flex flex-col gap-3" id="friend-requests-list"></div>
      `;
      container.appendChild(requestsSection);

      const requestsList = document.getElementById("friend-requests-list");
      friendRequests.forEach((request) => {
        const requestElement = createFriendElement(
          request.friend,
          true,
          request.id
        );
        requestsList.appendChild(requestElement);
      });
    }

    // Friends list
    if (friends.length > 0) {
      const friendsSection = document.createElement("div");
      friendsSection.innerHTML = `
        <div class="text-slate-200 font-bold mb-3">
          Friends (${friends.length})
        </div>
        <div class="flex flex-col gap-3" id="friends-list"></div>
      `;
      container.appendChild(friendsSection);

      const friendsList = document.getElementById("friends-list");
      friends.forEach((friend) => {
        const friendElement = createFriendElement(
          friend.friend,
          false,
          friend.id
        );
        friendsList.appendChild(friendElement);
      });
    }

    if (friendRequests.length === 0 && friends.length === 0) {
      const noFriendsSection = document.createElement("div");
      noFriendsSection.innerHTML = `
        <div class="text-center py-12 text-dusk">
          <i class="fas fa-user-friends text-5xl mb-4"></i>
          <h3 class="text-slate-200 font-bold text-lg mb-2">No friends yet</h3>
          <p class="text-azure">Add friends to start chatting</p>
        </div>
      `;
      container.appendChild(noFriendsSection);
    }
  }, 300);
}

function createFriendElement(friend, isRequest = false, friendshipId = null) {
  const friendElement = document.createElement("div");
  friendElement.className =
    "bg-midnight border border-lightabyss w-full rounded-3xl py-3 px-6 h-20 flex items-center justify-between";

  if (isRequest) {
    friendElement.innerHTML = `
      <div class="flex gap-3 h-full items-center">
        <img src="${
          friend.avatar_url || "../public/assets/images/blank-profile.png"
        }"
             alt="Profile Pic" class="rounded-full w-12 h-12 object-cover">
        <div class="flex flex-col justify-between h-[85%]">
          <div class="text-slate-200 text-[14px]">${friend.username}</div>
          <div class="text-azure text-[12px]">Wants to be friends</div>
        </div>
      </div>
      <div class="flex gap-3">
        <button class="reject-request bg-blaze cursor-pointer rounded-2xl h-10 w-10 flex items-center justify-center"
                data-request-id="${friendshipId}">
          <i class="fa-solid fa-xmark font-bold text-xl text-midnight"></i>
        </button>
        <button class="accept-request bg-green-400 cursor-pointer rounded-2xl h-10 w-10 flex items-center justify-center"
                data-request-id="${friendshipId}">
          <i class="fa-solid fa-check font-bold text-xl text-midnight"></i>
        </button>
      </div>
    `;
  } else {
    friendElement.innerHTML = `
      <div class="flex gap-3 h-full items-center">
        <img src="${
          friend.avatar_url || "../public/assets/images/blank-profile.png"
        }"
             alt="Profile Pic" class="rounded-full w-12 h-12 object-cover">
        <div class="flex flex-col justify-between h-[85%]">
          <div class="text-slate-200 text-[14px]">${friend.username}</div>
          <div class="text-azure text-[12px]">
            Friend
          </div>
        </div>
      </div>
      <div class="flex gap-3">
        <button class="message-friend bg-lightmidnight cursor-pointer rounded-2xl h-12 w-12 flex items-center justify-center"
                data-user-id="${friend.id}">
          <i class="fa-regular fa-comment-dots text-2xl text-frost"></i>
        </button>
        <button class="remove-friend bg-blaze cursor-pointer rounded-2xl h-12 w-12 flex items-center justify-center"
                data-friendship-id="${friendshipId}">
          <i class="fas fa-user-minus text-xl text-white"></i>
        </button>
      </div>
    `;
  }

  return friendElement;
}
function setupEventListeners() {
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".accept-request")) {
      console.log("Button cliked");
      const button = e.target.closest(".accept-request");
      const requestId = button.dataset.requestId;
      await handleFriendRequest(requestId, "accepted");
    } else if (e.target.closest(".reject-request")) {
      const button = e.target.closest(".reject-request");
      const requestId = button.dataset.requestId;
      await handleFriendRequest(requestId, "rejected");
    } else if (
      e.target.closest(".message-friend") ||
      e.target.closest(".message-user")
    ) {
      const button =
        e.target.closest(".message-friend") ||
        e.target.closest(".message-user");
      const userId = button.dataset.userId;
      openChatWithUser(userId);
    } else if (e.target.closest(".add-friend")) {
      const button = e.target.closest(".add-friend");
      const userId = button.dataset.userId;
      const success = await sendFriendRequest(userId);
      if (success) {
        const searchTerm = document.getElementById(
          "search-friends-input"
        ).value;
        const users = await searchUsers(searchTerm);
        renderSearchResults(users);
      }
    } else if (e.target.closest(".remove-friend")) {
      const button = e.target.closest(".remove-friend");
      const friendshipId = button.dataset.friendshipId;
      const success = await removeFriend(friendshipId);
      if (success) {
        const searchTerm = document.getElementById(
          "search-friends-input"
        ).value;
        if (searchTerm) {
          const users = await searchUsers(searchTerm);
          renderSearchResults(users);
        } else {
          await loadFriends();
        }
      }
    } else if (e.target.closest(".cancel-request")) {
      const button = e.target.closest(".cancel-request");
      const requestId = button.dataset.requestId;
      const success = await removeFriend(requestId);
      if (success) {
        const searchTerm = document.getElementById(
          "search-friends-input"
        ).value;
        const users = await searchUsers(searchTerm);
        renderSearchResults(users);
      }
    }
  });

  // Search users
  const searchInput = document.getElementById("search-friends-input");
  let searchTimeout;

  searchInput.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim();

    clearTimeout(searchTimeout);

    // If search term is empty, show friends list
    if (!searchTerm) {
      const searchResultsSection = document.getElementById(
        "search-results-section"
      );
      if (searchResultsSection) {
        searchResultsSection.remove();
      }
      await loadFriends();
      return;
    }

    // set new timeout to debounce the search
    searchTimeout = setTimeout(async () => {
      const users = await searchUsers(searchTerm);
      renderSearchResults(users);
    }, 300);
  });
}

async function openChatWithUser(userId) {
  try {
    const chat = await createChat(userId);

    //  user's profile info
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // open the chat conversation
    openChatConversation(userProfile.username, chat.id, userProfile.avatar_url);

    // switch to the chat tab if not already there
    switchTab("chat", 0);
  } catch (error) {
    console.error("Error opening chat:", error);
    showNotification("Failed to open chat. Please try again.", "error");
  }
}
// handle friend request (accept/reject)
async function handleFriendRequest(requestId, status) {
  const acceptBtn = document.querySelector(
    `.accept-request[data-request-id="${requestId}"]`
  );
  const rejectBtn = document.querySelector(
    `.reject-request[data-request-id="${requestId}"]`
  );

  try {
    if (acceptBtn) showButtonLoading(acceptBtn);
    if (rejectBtn) showButtonLoading(rejectBtn);

    const { error } = await supabase
      .from("friends")
      .update({ status })
      .eq("id", requestId);

    if (error) throw error;

    await loadFriends();
  } catch (error) {
    console.error("Error handling friend request:", error);
    showNotification("Failed to process request", "error");
  } finally {
    if (acceptBtn) hideButtonLoading(acceptBtn);
    if (rejectBtn) hideButtonLoading(rejectBtn);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await getCurrentUser();
  if (currentUser) {
    await loadFriends();
    setupEventListeners();
  }
});

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

function postComment(inputId, sectionId) {
  const input = document.getElementById(inputId);
  const commentText = input.value.trim();
  if (commentText) {
    // for the backend
    console.log("Posting comment:", commentText);

    // simulation
    const commentsContainer = document.querySelector(
      `#${sectionId} > div:first-child`
    );
    const newComment = document.createElement("div");
    newComment.className = "flex gap-3 mb-3";
    newComment.innerHTML = `
      <img 
        src="../public/assets/images/blank-profile.png" 
        alt="You" 
        class="w-10 h-10 rounded-full object-cover"
      >
      <div class="w-fit bg-lightabyss rounded-2xl p-3">
        <div class="text-slate-200 font-bold text-sm">You</div>
        <p class="text-azure text-sm">${commentText}</p>
        <div class="flex items-center gap-3 mt-1">
          <span class="text-dusk text-xs">Just now</span>
          <button class="text-dusk text-xs hover:text-slate-200">Like</button>
          <button class="text-dusk text-xs hover:text-slate-200">Reply</button>
        </div>
      </div>
    `;
    commentsContainer.appendChild(newComment);

    input.value = "";
    checkCommentInput(input);
  }
}

document.querySelectorAll('[id^="comment-input-"]').forEach((input) => {
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const inputId = this.id;
      const sectionId = this.closest('[id^="comments-section-"]').id;
      postComment(inputId, sectionId);
    }
  });
});

window.switchTab = switchTab;
window.toggleComments = toggleComments;
window.postComment = postComment;
window.checkCommentInput = checkCommentInput;
