import { supabase } from "./database.js";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getUserProfile,
  uploadAvatar,
} from "./auth.js";
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
signupBtn.addEventListener("click", () => {
  signupModal.classList.remove("hidden");
  signupModal.classList.add("flex");
});
logoutBtn.addEventListener("click", handleLogout);

closeLoginModal.addEventListener("click", () => {
  loginModal.classList.add("hidden");
  loginModal.classList.remove("flex");
});
closeSignupModal.addEventListener("click", () => {
  signupModal.classList.add("hidden");
  signupModal.classList.remove("flex");
});
switchToSignup.addEventListener("click", () => {
  loginModal.classList.add("hidden");
  signupModal.classList.remove("hidden");
  loginModal.classList.remove("flex");
  signupModal.classList.add("flex");
});
switchToLogin.addEventListener("click", () => {
  signupModal.classList.add("hidden");
  loginModal.classList.remove("hidden");
  signupModal.classList.remove("flex");
  loginModal.classList.add("flex");
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
    // First sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Then create the profile in the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: authData.user.id,
          username: username,
          email: email,
        },
      ]);

    if (profileError) throw profileError;

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
    // Get the profile data from the profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    // Use the username from profiles table
    document.getElementById("username").textContent =
      profile?.username || "User";
    document.getElementById("account-id").textContent = user.email;

    authButtons.classList.add("hidden");
    userMenu.classList.remove("hidden");

    // Use avatar_url from profiles table
    const avatarUrl = profile?.avatar_url;

    if (avatarUrl) {
      const profilePic = document.getElementById("profile-picture");
      const currentUserAvatar = document.getElementById("current-user-avatar");

      if (profilePic) profilePic.src = avatarUrl;
      if (currentUserAvatar) currentUserAvatar.src = avatarUrl;
    }
  } catch (error) {
    showNotification("Error updating UI", "error");
    console.error("Error updating UI:", error);
  }
}

function updateUIForGuest() {
  document.getElementById("username").textContent = "Guest";
  document.getElementById("account-id").textContent = "Not logged in";
  authButtons.classList.remove("hidden");
  userMenu.classList.add("hidden");
}

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

    // Update the avatar_url in the profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) throw error;

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

function setupAvatarErrorHandling() {
  document.querySelectorAll('img[src*="avatar"]').forEach((img) => {
    img.onerror = async function () {
      const user = await getCurrentUser();
      if (user) {
        // Get username from profiles table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (!error && profile?.username) {
          // UI Avatars if custom avatar fails to load
          this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            profile.username
          )}&background=random`;
        }
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
