import { supabase } from "./database.js";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getUserProfile,
  uploadAvatar,
} from "./auth.js";
// import { saveGameResult } from "./gameLogic.js";
import { showNotification } from "./utils.js";

// DOM Elements
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const authButtons = document.getElementById("auth-buttons");
const userMenu = document.getElementById("user-menu");

// Modal elements
const loginModal = document.getElementById("login-modal");
const signupModal = document.getElementById("signup-modal");
const closeLoginModal = document.getElementById("close-login-modal");
const closeSignupModal = document.getElementById("close-signup-modal");
const switchToSignup = document.getElementById("switch-to-signup");
const switchToLogin = document.getElementById("switch-to-login");

// Forms
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

// Event Listeners
loginBtn.addEventListener("click", () => loginModal.classList.remove("hidden"));
signupBtn.addEventListener("click", () =>
  signupModal.classList.remove("hidden")
);
logoutBtn.addEventListener("click", handleLogout);

closeLoginModal.addEventListener("click", () =>
  loginModal.classList.add("hidden")
);
closeSignupModal.addEventListener("click", () =>
  signupModal.classList.add("hidden")
);
switchToSignup.addEventListener("click", () => {
  loginModal.classList.add("hidden");
  signupModal.classList.remove("hidden");
});
switchToLogin.addEventListener("click", () => {
  signupModal.classList.add("hidden");
  loginModal.classList.remove("hidden");
});

loginForm.addEventListener("submit", handleLogin);
signupForm.addEventListener("submit", handleSignup);

checkAuthState();

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    updateUIForLoggedInUser(session.user);
  } else {
    updateUIForGuest();
  }
});

async function checkAuthState() {
  const user = await getCurrentUser();
  if (user) {
    updateUIForLoggedInUser(user);
  } else {
    updateUIForGuest();
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const username = document.getElementById("signup-username").value;

  try {
    const { error } = await signUp(email, password, username);
    if (error) throw error;

    signupModal.classList.add("hidden");
    signupForm.reset();
    showNotification("Please verify your email!", "success");
  } catch (error) {
    showNotification(error.message, "error");
    console.log(error.message);
  }
}

async function handleLogout() {
  try {
    console.log("Loggin out!");
    await signOut();
    location.reload();
  } catch (error) {
    showNotification(error.message, "error");
    console.log(error.message);
  }
}

async function updateUIForLoggedInUser(user) {
  try {
    document.getElementById("username").textContent =
      user.user_metadata?.username || "User";
    document.getElementById("account-id").textContent = user.email;

    authButtons.classList.add("hidden");
    userMenu.classList.remove("hidden");

    // get the avatarurl
    const profile = await getUserProfile(user.id);
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

    if (avatarUrl) {
      const profilePic = document.getElementById("profile-picture");
      const currentUserAvatar = document.getElementById("current-user-avatar");

      if (profilePic) profilePic.src = avatarUrl;
      if (currentUserAvatar) currentUserAvatar.src = avatarUrl;
    }
  } catch (error) {
    showNotification("Error updating UI","error")
    console.error("Error updating UI:", error);
  }
}

function updateUIForGuest() {
  document.getElementById("username").textContent = "Guest";
  document.getElementById("account-id").textContent = "Not logged in";
  authButtons.classList.remove("hidden");
  userMenu.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await checkAuthState();
  } catch (error) {
    console.error("Auth initialization error:", error);
  }
});
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const { data, error } = await signIn(email, password);
    if (error) throw error;

    loginModal.classList.add("hidden");
    loginForm.reset();
    console.log("Login successful:", data);
    location.reload();
  } catch (error) {
    console.error("Login error:", error);
    showNotification(`Login failed : ${error.message}`, "error");
  }
}
async function handleAvatarUpload(file) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      showLoginPrompt("upload an avatar");
      return null;
    }

    // Validate file
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      showNotification(
        "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
        "error"
      );
      return null;
    }

    if (file.size > maxSize) {
      showNotification("Image size must be less than 5MB", "error");
      return null;
    }

    const avatarUrl = await uploadAvatar(user.id, file);

    // Update all avatar images in UI
    document.querySelectorAll(".user-avatar").forEach((img) => {
      img.src = avatarUrl;
    });

    return avatarUrl;
  } catch (error) {
    console.error("Detailed upload error:", error);

    let errorMessage = "Upload failed. Please try again.";
    if (error.message.includes("403")) {
      errorMessage = "Permission denied. Please log in again.";
    } else if (error.message.includes("413")) {
      errorMessage = "File is too large (max 5MB)";
    }

    showNotification(errorMessage);
    return null;
  }
}
let avatarInput = null;

function addAvatarUploadHandler() {
  if (!avatarInput) {
    avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.accept = "image/*";
    avatarInput.style.display = "none";
    avatarInput.id = "avatar-upload-input";
    document.body.appendChild(avatarInput);

    avatarInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        await handleAvatarUpload(file);
      }
      // reset the input to allow selecting the same file again
      avatarInput.value = "";
    });
  }

  // add click handlers to both avatar elements
  const avatarElements = [
    document.getElementById("profile-picture"),
    document.getElementById("current-user-avatar"),
  ];

  avatarElements.forEach((element) => {
    if (element && !element.hasAttribute("data-avatar-listener")) {
      element.style.cursor = "pointer";
      element.addEventListener("click", handleAvatarClick);
      element.setAttribute("data-avatar-listener", "true");
    }
  });
}

function handleAvatarClick() {
  if (!avatarInput) return;

  const user = getCurrentUser();
  if (!user) {
    showLoginPrompt("upload an avatar");
    return;
  }

  avatarInput.click();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await checkAuthState();
    addAvatarUploadHandler();
  } catch (error) {
    console.error("Auth initialization error:", error);
  }
});

function setupAvatarErrorHandling() {
  document.querySelectorAll('img[src*="avatar"]').forEach((img) => {
    img.onerror = function () {
      const user = getCurrentUser();
      if (user && user.user_metadata?.username) {
        // UI Avatars if custom avatar fails to load
        this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.user_metadata.username
        )}&background=random`;
      }
    };
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await checkAuthState();
    addAvatarUploadHandler();
    setupAvatarErrorHandling();
  } catch (error) {
    console.error("Auth initialization error:", error);
  }
});
