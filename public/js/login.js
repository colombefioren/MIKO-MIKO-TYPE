import { supabase } from "./database.js";
import { signIn, signUp, signOut, getCurrentUser } from "./auth.js";
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
  } catch (error) {
    alert(error.message);
  }
}

async function handleLogout() {
  try {
    console.log("Loggin out!");
    await signOut();
  } catch (error) {
    alert(error.message);
  }
}

function updateUIForLoggedInUser(user) {
  document.getElementById("username").textContent =
    user.user_metadata?.username || "User";
  document.getElementById("account-id").textContent = user.email;

  authButtons.classList.add("hidden");
  userMenu.classList.remove("hidden");

  if (user.user_metadata?.avatar_url) {
    document.getElementById("profile-picture").src =
      user.user_metadata.avatar_url;
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
  } catch (error) {
    console.error("Login error:", error);
    alert(`Login failed: ${error.message}`);
  }
}
