const loginSection = document.getElementById("login-section");
const signinSection = document.getElementById("signin-section");
const crossSignin = document.getElementById("cross-signin");
const crossLogin = document.getElementById("cross-login");

const toggleLoginSection = () => {
  loginSection.classList.toggle("hidden");
  loginSection.classList.toggle("flex");
};
const toggleSigninSection = () => {
  signinSection.classList.toggle("hidden");
  signinSection.classList.toggle("flex");
};

crossSignin.addEventListener("click", () => {
  signinSection.classList.toggle("hidden");
  signinSection.classList.toggle("flex");
});

crossLogin.addEventListener("click", () => {
  loginSection.classList.toggle("hidden");
  loginSection.classList.toggle("flex");
});
