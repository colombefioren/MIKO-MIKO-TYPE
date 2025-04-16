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
import { createPost } from "./socials.js";

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

// Check auth state on load
checkAuthState();

// Auth state change handler
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
    alert(
      "Account created successfully! Please check your email for verification."
    );
    location.reload();
  } catch (error) {
    alert(error.message);
  }
}

async function handleLogout() {
  try {
    console.log("Loggin out!");
    await signOut();
    location.reload();
  } catch (error) {
    alert(error.message);
  }
}

async function updateUIForLoggedInUser(user) {
  try {
    document.getElementById("username").textContent =
      user.user_metadata?.username || "User";
    document.getElementById("account-id").textContent = user.email;

    authButtons.classList.add("hidden");
    userMenu.classList.remove("hidden");

    // Get the most up-to-date avatar URL
    const profile = await getUserProfile(user.id);
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

    if (avatarUrl) {
      const profilePic = document.getElementById("profile-picture");
      const currentUserAvatar = document.getElementById("current-user-avatar");

      if (profilePic) profilePic.src = avatarUrl;
      if (currentUserAvatar) currentUserAvatar.src = avatarUrl;
    }
  } catch (error) {
    console.error("Error updating UI:", error);
  }
}

function updateUIForGuest() {
  document.getElementById("username").textContent = "Guest";
  document.getElementById("account-id").textContent = "Not logged in";
  authButtons.classList.remove("hidden");
  userMenu.classList.add("hidden");
}

// After game completes
async function eComplete(result) {
  const user = await getCurrentUser();
  if (!user) {
    const login = confirm(
      "You need to be logged in to save your results. Would you like to log in now?"
    );
    if (login) {
      loginModal.classList.remove("hidden");
    }
    return;
  }

  const savedResult = await saveGameResult(result);

  // Show share modal
  const share = confirm(
    `Your score: ${savedResult.wpm} WPM! Share your result?`
  );
  if (share) {
    const content = prompt("Add a message to your post:");
    if (content) {
      await createPost(content, savedResult);
      alert("Your score has been shared!");
    }
  }
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
    alert(`Login failed: ${error.message}`);
  }
}
async function handleAvatarUpload(file) {
  const user = await getCurrentUser();
  if (!user) {
    alert("Please log in to upload an avatar");
    return null;
  }

  // validata file type
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    alert("Please upload a valid image file (JPEG, PNG, GIF, or WebP)");
    return null;
  }

  if (file.size > maxSize) {
    alert("Image size must be less than 2MB");
    return null;
  }

  try {
  
    document
      .getElementById("profile-picture")
      .classList.add("avatar-uploading");

    const avatarUrl = await uploadAvatar(user.id, file);

    document.getElementById("profile-picture").src = avatarUrl;
    document.getElementById("current-user-avatar").src = avatarUrl;

    return avatarUrl;
  } catch (error) {
    console.error("Detailed upload error:", error);

   
    if (error.message.includes("403")) {
      alert(
        "Upload failed: Permission denied. Please ensure you are logged in properly."
      );
    } else if (error.message.includes("413")) {
      alert("Upload failed: File too large. Maximum size is 2MB.");
    } else {
      alert(`Upload failed: ${error.message}`);
    }

    return null;
  } finally {
    document
      .getElementById("profile-picture")
      .classList.remove("avatar-uploading");
  }
}

function addAvatarUploadHandler() {
  const avatarInput = document.createElement("input");
  avatarInput.type = "file";
  avatarInput.accept = "image/*";
  avatarInput.style.display = "none";
  avatarInput.id = "avatar-upload-input";

  avatarInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleAvatarUpload(file);
    }
  });

  document.body.appendChild(avatarInput);

  // make profile picture clickable for upload
  const profilePic = document.getElementById("profile-picture");
  if (profilePic) {
    profilePic.style.cursor = "pointer";
    profilePic.addEventListener("click", () => {
      avatarInput.click();
    });
  }
  const currentUserAvatar = document.getElementById("current-user-avatar");
  if (currentUserAvatar) {
    currentUserAvatar.style.cursor = "pointer";
    currentUserAvatar.addEventListener("click", () => {
      avatarInput.click();
    });
  }
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
