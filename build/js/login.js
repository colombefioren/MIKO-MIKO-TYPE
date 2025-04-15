const loginSection = document.getElementById("login-section");
const signupSection = document.getElementById("signup-section");
const crossSignup = document.getElementById("cross-signup");
const crossLogin = document.getElementById("cross-login");

const toggleLoginSection = () => {
  loginSection.classList.toggle("hidden");
  loginSection.classList.toggle("flex");
};
const toggleSigninSection = () => {
  signupSection.classList.toggle("hidden");
  signupSection.classList.toggle("flex");
};

crossSignup.addEventListener("click", () => {
  signupSection.classList.toggle("hidden");
  signupSection.classList.toggle("flex");
});

crossLogin.addEventListener("click", () => {
  loginSection.classList.toggle("hidden");
  loginSection.classList.toggle("flex");
});
