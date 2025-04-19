import { supabase } from "./database.js";
import { getCurrentUser } from "./auth.js";
import { showNotification } from "./utils.js";

// DOM Elements
const profileTitle = document.getElementById("profile-title");
const profileActions = document.getElementById("profile-actions");
const profileAvatar = document.getElementById("profile-avatar");
const avatarEdit = document.getElementById("avatar-edit");
const avatarUpload = document.getElementById("avatar-upload");
const profileUsername = document.getElementById("profile-username");
const profileHandle = document.getElementById("profile-handle");
const profileBio = document.getElementById("profile-bio");
const profileBioEdit = document.getElementById("profile-bio-edit");
const profileBioContainer = document.getElementById("profile-bio-container");
const saveBioBtn = document.getElementById("save-bio-btn");
const cancelBioBtn = document.getElementById("cancel-bio-btn");
const joinDate = document.getElementById("join-date");
const testsCount = document.getElementById("tests-count");
const avgWpm = document.getElementById("avg-wpm");
const avgAccuracy = document.getElementById("avg-accuracy");
const bestWpm = document.getElementById("best-wpm");
const bestAccuracy = document.getElementById("best-accuracy");
const wpmBar = document.getElementById("wpm-bar");
const accuracyBar = document.getElementById("accuracy-bar");
const activityList = document.getElementById("activity-list");
const friendsContainer = document.getElementById("friends-container");
const settingsTab = document.getElementById("settings-tab");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

// Settings elements
const usernameInput = document.getElementById("username-input");
const saveUsernameBtn = document.getElementById("save-username-btn");
const emailInput = document.getElementById("email-input");
const changePasswordBtn = document.getElementById("change-password-btn");
const deleteAccountBtn = document.getElementById("delete-account-btn");

// Modals
const changePasswordModal = document.getElementById("change-password-modal");
const closePasswordModal = document.getElementById("close-password-modal");
const changePasswordForm = document.getElementById("change-password-form");
const deleteAccountModal = document.getElementById("delete-account-modal");
const closeDeleteModal = document.getElementById("close-delete-modal");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

let currentUser = null;
let profileUser = null;
let isCurrentUserProfile = false;

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    currentUser = await getCurrentUser();
    if (!currentUser) {
      document.getElementById("guest-interface").classList.remove("hidden");
      document.getElementById("user-profile").classList.add("hidden")
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("id");

    isCurrentUserProfile = !userId || userId === currentUser.id;

    console.log("isCurrentUserProfile:", isCurrentUserProfile);
    console.log(
      "Loading profile for:",
      isCurrentUserProfile ? currentUser.id : userId
    );

    await loadUserProfile(isCurrentUserProfile ? currentUser.id : userId);
    setupEventListeners();
    setupTabs();
  } catch (error) {
    console.error("Initialization error:", error);
    showNotification("Failed to load profile", "error");
  }
});
async function loadUserProfile(userId) {
  try {
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    profileUser = user;

    profileTitle.textContent = `${user.username}'s Profile`;
    profileUsername.textContent = user.username;
    profileHandle.textContent = `@${user.username
      .toLowerCase()
      .split(" ")
      .join("")}`;

    profileAvatar.src =
      user.avatar_url || "../public/assets/images/blank-profile.png";

    if (user.bio) {
      profileBio.textContent = user.bio;
    } else {
      profileBio.textContent = "No bio yet";
    }

    if (user.created_at) {
      const joinDateObj = new Date(user.created_at);
      joinDate.textContent = joinDateObj.toLocaleDateString();
    }

    await loadUserStats(userId);

    await loadRecentActivity(userId);

    await loadFriendsList(userId);

    setupProfileActions();

    // show settings tab if it's current user's profile
    if (isCurrentUserProfile) {
      settingsTab.classList.remove("hidden");
      loadSettings();
    } else {
      settingsTab.classList.add("hidden");
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    showNotification("Failed to load profile", "error");
  }
}

async function loadUserStats(userId) {
  try {
    const { data: gameResults, error: resultsError } = await supabase
      .from("game_results")
      .select("wpm, accuracy")
      .eq("user_id", userId);

    if (resultsError) throw resultsError;

    // Update tests count
    testsCount.textContent = gameResults.length;

    if (gameResults.length > 0) {
      // Calculate averages
      const totalWpm = gameResults.reduce((sum, result) => sum + result.wpm, 0);
      const totalAccuracy = gameResults.reduce(
        (sum, result) => sum + result.accuracy,
        0
      );

      const avgWpmValue = Math.round(totalWpm / gameResults.length);
      const avgAccuracyValue = Math.round(totalAccuracy / gameResults.length);

      // Find best scores
      const bestWpmValue = Math.max(...gameResults.map((result) => result.wpm));
      const bestAccuracyValue = Math.max(
        ...gameResults.map((result) => result.accuracy)
      );

      avgWpm.textContent = avgWpmValue;
      avgAccuracy.textContent = `${avgAccuracyValue}%`;
      bestWpm.textContent = bestWpmValue;
      bestAccuracy.textContent = `${bestAccuracyValue}%`;

      wpmBar.style.width = `${Math.min(100, avgWpmValue / 2)}%`;
      accuracyBar.style.width = `${avgAccuracyValue}%`;
    }
  } catch (error) {
    console.error("Error loading user stats:", error);
  }
}

async function loadRecentActivity(userId) {
  try {
    activityList.innerHTML = `
      <div class="col-span-12 text-center py-8">
        <div class="loading-spinner"></div>
      </div>
    `;

    const { data: activity, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (activity.length === 0) {
      activityList.innerHTML = `
        <div class="col-span-12 text-center py-8 text-dusk">
          <i class="fas fa-keyboard text-4xl mb-3"></i>
          <h3 class="text-slate-200 font-bold text-lg mb-1">No activity yet</h3>
          <p class="text-azure">Complete typing tests to see your activity</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = "";

    activity.forEach((item) => {
      const activityItem = document.createElement("div");
      activityItem.className =
        "grid grid-cols-12 items-center p-4 text-slate-300 text-sm hover:bg-lightabyss/10";

      const date = new Date(item.created_at);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      activityItem.innerHTML = `
        <div class="col-span-2">
          <div class="text-white">${formattedDate}</div>
          <div class="text-azure text-xs">${formattedTime}</div>
        </div>
        <div class="col-span-3">${item.mode || "Standard"}</div>
        <div class="col-span-2 text-right text-white font-bold">${
          item.wpm
        }</div>
        <div class="col-span-2 text-right text-white font-bold">${
          item.accuracy
        }%</div>
        <div class="col-span-3 text-right">
          <button class="text-azure hover:text-blaze cursor-pointer">
            <i class="fas fa-ellipsis-h"></i>
          </button>
        </div>
      `;

      activityList.appendChild(activityItem);
    });
  } catch (error) {
    console.error("Error loading recent activity:", error);
    activityList.innerHTML = `
      <div class="col-span-12 text-center py-8 text-dusk">
        <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
        <h3 class="text-slate-200 font-bold text-lg mb-1">Error loading activity</h3>
        <p class="text-azure">Please try again later</p>
      </div>
    `;
  }
}

async function loadFriendsList(userId) {
  try {
    friendsContainer.innerHTML = `
      <div class="col-span-12 text-center py-8">
        <div class="loading-spinner"></div>
      </div>
    `;

    const { data: friends1, error: friends1Error } = await supabase
      .from("friends")
      .select("*, friend:user2_id (id, username, avatar_url)")
      .eq("user1_id", userId)
      .eq("status", "accepted");

    const { data: friends2, error: friends2Error } = await supabase
      .from("friends")
      .select("*, friend:user1_id (id, username, avatar_url)")
      .eq("user2_id", userId)
      .eq("status", "accepted");

    if (friends1Error || friends2Error) throw friends1Error || friends2Error;

    const allFriends = [...(friends1 || []), ...(friends2 || [])];

    if (allFriends.length === 0) {
      friendsContainer.innerHTML = `
        <div class="col-span-12 text-center py-8 text-dusk">
          <i class="fas fa-user-friends text-4xl mb-3"></i>
          <h3 class="text-slate-200 font-bold text-lg mb-1">No friends yet</h3>
          <p class="text-azure">Add friends to see them here</p>
        </div>
      `;
      return;
    }

    friendsContainer.innerHTML = "";

    allFriends.forEach((friend) => {
      const friendUser = friend.friend;
      const friendElement = document.createElement("div");
      friendElement.className =
        "flex items-center p-3 bg-lightabyss/30 rounded-lg hover:bg-lightabyss/50 cursor-pointer";

      friendElement.innerHTML = `
        <img src="${
          friendUser.avatar_url || "../public/assets/images/blank-profile.png"
        }" 
             class="w-12 h-12 rounded-full object-cover mr-3">
        <div>
          <div class="text-white font-medium">${friendUser.username}</div>
          <div class="text-azure text-xs">Friend</div>
        </div>
      `;

      friendElement.addEventListener("click", () => {
        window.location.href = `race.html?id=${friendUser.id}`;
      });

      friendsContainer.appendChild(friendElement);
    });
  } catch (error) {
    console.error("Error loading friends list:", error);
    friendsContainer.innerHTML = `
      <div class="col-span-12 text-center py-8 text-dusk">
        <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
        <h3 class="text-slate-200 font-bold text-lg mb-1">Error loading friends</h3>
        <p class="text-azure">Please try again later</p>
      </div>
    `;
  }
}

function setupProfileActions() {
  profileActions.innerHTML = "";

  if (isCurrentUserProfile) {
    const editBioBtn = document.createElement("button");
    editBioBtn.className =
      "bg-blaze text-white px-4 py-2 rounded-lg hover:bg-blaze/90 transition-colors cursor-pointer";
    editBioBtn.innerHTML = '<i class="fas fa-edit mr-2"></i> Edit Profile';
    editBioBtn.addEventListener("click", () => {
      profileBioEdit.value =
        profileBio.textContent === "No bio yet" ? "" : profileBio.textContent;
      profileBio.classList.add("hidden");
      profileBioEdit.classList.remove("hidden");
      saveBioBtn.classList.remove("hidden");
      cancelBioBtn.classList.remove("hidden");
    });

    profileActions.appendChild(editBioBtn);
  } else {
    checkFriendshipStatus().then((status) => {
      if (status === "accepted") {
        const chatBtn = document.createElement("button");
        chatBtn.className =
          "bg-frost text-midnight px-4 py-2 rounded-lg hover:bg-frost/90 transition-colors cursor-pointer";
        chatBtn.innerHTML = '<i class="fas fa-comment-dots mr-2"></i> Chat';
        chatBtn.addEventListener("click", () =>
          openChatWithUser(profileUser.id)
        );

        const removeFriendBtn = document.createElement("button");
        removeFriendBtn.className =
          "bg-blaze text-white px-4 py-2 rounded-lg hover:bg-blaze/90 transition-colors cursor-pointer ml-3";
        removeFriendBtn.innerHTML =
          '<i class="fas fa-user-minus mr-2"></i> Remove Friend';
        removeFriendBtn.addEventListener("click", () => removeFriend());

        profileActions.appendChild(chatBtn);
        profileActions.appendChild(removeFriendBtn);
      } else if (status === "pending") {
        const cancelRequestBtn = document.createElement("button");
        cancelRequestBtn.className =
          "bg-dusk text-white px-4 py-2 rounded-lg hover:bg-dusk/90 transition-colors cursor-pointer";
        cancelRequestBtn.innerHTML =
          '<i class="fas fa-clock mr-2"></i> Request Sent';
        cancelRequestBtn.addEventListener("click", () => cancelFriendRequest());

        profileActions.appendChild(cancelRequestBtn);
      } else if (status === "incoming") {
        const acceptBtn = document.createElement("button");
        acceptBtn.className =
          "bg-green-400 text-midnight px-4 py-2 rounded-lg hover:bg-green-400/90 transition-colors cursor-pointer";
        acceptBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Accept';
        acceptBtn.addEventListener("click", () => respondToFriendRequest(true));

        const rejectBtn = document.createElement("button");
        rejectBtn.className =
          "bg-blaze text-white px-4 py-2 rounded-lg hover:bg-blaze/90 transition-colors cursor-pointer ml-3";
        rejectBtn.innerHTML = '<i class="fas fa-times mr-2"></i> Reject';
        rejectBtn.addEventListener("click", () =>
          respondToFriendRequest(false)
        );

        profileActions.appendChild(acceptBtn);
        profileActions.appendChild(rejectBtn);
      } else {
        const addFriendBtn = document.createElement("button");
        addFriendBtn.className =
          "bg-blaze text-white px-4 py-2 rounded-lg hover:bg-blaze/90 transition-colors cursor-pointer";
        addFriendBtn.innerHTML =
          '<i class="fas fa-user-plus mr-2"></i> Add Friend';
        addFriendBtn.addEventListener("click", () => sendFriendRequest());

        profileActions.appendChild(addFriendBtn);
      }
    });
  }
}

async function checkFriendshipStatus() {
  if (!currentUser) return "none";

  try {
    const { data: friendship, error } = await supabase
      .from("friends")
      .select("*")
      .or(
        `and(user1_id.eq.${currentUser.id},user2_id.eq.${profileUser.id}),and(user1_id.eq.${profileUser.id},user2_id.eq.${currentUser.id})`
      )
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!friendship) return "none";

    if (friendship.status === "accepted") return "accepted";

    if (friendship.user1_id === currentUser.id) {
      return "pending";
    } else {
      return "incoming";
    }
  } catch (error) {
    console.error("Error checking friendship status:", error);
    return "none";
  }
}

async function sendFriendRequest() {
  try {
    const { error } = await supabase.from("friends").insert([
      {
        user1_id: currentUser.id,
        user2_id: profileUser.id,
        status: "pending",
      },
    ]);

    if (error) throw error;

    showNotification("Friend request sent", "success");
    setupProfileActions();
  } catch (error) {
    console.error("Error sending friend request:", error);
    showNotification("Failed to send friend request", "error");
  }
}

async function cancelFriendRequest() {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("user1_id", currentUser.id)
      .eq("user2_id", profileUser.id);

    if (error) throw error;

    showNotification("Friend request cancelled", "success");
    setupProfileActions();
  } catch (error) {
    console.error("Error cancelling friend request:", error);
    showNotification("Failed to cancel friend request", "error");
  }
}

async function respondToFriendRequest(accept) {
  try {
    if (accept) {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("user1_id", profileUser.id)
        .eq("user2_id", currentUser.id);

      if (error) throw error;

      showNotification("Friend request accepted", "success");
    } else {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("user1_id", profileUser.id)
        .eq("user2_id", currentUser.id);

      if (error) throw error;

      showNotification("Friend request rejected", "success");
    }

    setupProfileActions();
  } catch (error) {
    console.error("Error responding to friend request:", error);
    showNotification("Failed to respond to friend request", "error");
  }
}

async function removeFriend() {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .or(
        `and(user1_id.eq.${currentUser.id},user2_id.eq.${profileUser.id}),and(user1_id.eq.${profileUser.id},user2_id.eq.${currentUser.id})`
      );

    if (error) throw error;

    showNotification("Friend removed", "success");
    setupProfileActions();
  } catch (error) {
    console.error("Error removing friend:", error);
    showNotification("Failed to remove friend", "error");
  }
}

function loadSettings() {
  if (!isCurrentUserProfile) return;

  usernameInput.value = profileUser.username;
  emailInput.value = currentUser.email;
}

function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => {
        btn.classList.remove("active");
        btn.classList.add("text-azure");
        btn.classList.remove("text-white");
      });

      tabContents.forEach((content) => content.classList.remove("active"));
      tabContents.forEach((content) => content.classList.add("hidden"));

      button.classList.add("active");
      button.classList.remove("text-azure");
      button.classList.add("text-white");

      const tabName = button.dataset.tab;
      document.getElementById(`${tabName}-content`).classList.add("active");
      document.getElementById(`${tabName}-content`).classList.remove("hidden");
    });
  });
}

function setupEventListeners() {
  avatarEdit.addEventListener("click", () => {
    avatarUpload.click();
  });

  avatarUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      avatarEdit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatar")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatar").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      profileAvatar.src = publicUrl + "?t=" + Date.now();

      avatarEdit.innerHTML = '<i class="fas fa-camera"></i>';

      showNotification("Avatar updated successfully!", "success");
    } catch (error) {
      console.error("Upload error:", error);
      avatarEdit.innerHTML = '<i class="fas fa-camera"></i>';
      showNotification(error.message || "Failed to upload avatar", "error");
    }
  });

  saveBioBtn.addEventListener("click", async () => {
    const newBio = profileBioEdit.value.trim();

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ bio: newBio })
        .eq("id", currentUser.id);

      if (error) throw error;

      profileBio.textContent = newBio || "No bio yet";
      toggleBioEdit(false);
      showNotification("Bio updated successfully", "success");
    } catch (error) {
      console.error("Error updating bio:", error);
      showNotification("Failed to update bio", "error");
    }
  });

  cancelBioBtn.addEventListener("click", () => {
    toggleBioEdit(false);
  });

  saveUsernameBtn.addEventListener("click", async () => {
    const newUsername = usernameInput.value.trim();

    if (!newUsername) {
      showNotification("Username cannot be empty", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", currentUser.id);

      if (error) throw error;

      profileUsername.textContent = newUsername;
      profileHandle.textContent = `@${newUsername}`;
      showNotification("Username updated successfully", "success");
    } catch (error) {
      console.error("Error updating username:", error);
      showNotification("Failed to update username", "error");
    }
  });

  changePasswordBtn.addEventListener("click", () => {
    changePasswordModal.classList.remove("hidden");
  });

  closePasswordModal.addEventListener("click", () => {
    changePasswordModal.classList.add("hidden");
  });

  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      showNotification("New passwords don't match", "error");
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (signInError) throw signInError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      showNotification("Password updated successfully", "success");
      changePasswordModal.classList.add("hidden");
      changePasswordForm.reset();
    } catch (error) {
      console.error("Error changing password:", error);
      showNotification(error.message || "Failed to change password", "error");
    }
  });

  deleteAccountBtn.addEventListener("click", () => {
    deleteAccountModal.classList.remove("hidden");
  });

  closeDeleteModal.addEventListener("click", () => {
    deleteAccountModal.classList.add("hidden");
  });

  cancelDeleteBtn.addEventListener("click", () => {
    deleteAccountModal.classList.add("hidden");
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(
        currentUser.id
      );
      if (authError) throw authError;

      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      showNotification("Failed to delete account", "error");
      deleteAccountModal.classList.add("hidden");
    }
  });

  profileAvatar.addEventListener("mouseenter", () => {
    if (isCurrentUserProfile) {
      avatarEdit.classList.remove("hidden");
    }
  });

  profileAvatar.addEventListener("mouseleave", () => {
    avatarEdit.classList.add("hidden");
  });
}

function toggleBioEdit(showEdit) {
  if (showEdit) {
    profileBio.classList.add("hidden");
    profileBioEdit.classList.remove("hidden");
    saveBioBtn.classList.remove("hidden");
    cancelBioBtn.classList.remove("hidden");
  } else {
    profileBio.classList.remove("hidden");
    profileBioEdit.classList.add("hidden");
    saveBioBtn.classList.add("hidden");
    cancelBioBtn.classList.add("hidden");
  }
}
