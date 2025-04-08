// Change from .buttonlinks to .button-links to match your HTML
const buttons = document.querySelectorAll(".button-links");
const buttonTexts = document.querySelectorAll(".button-text");
const buttonIcons = document.querySelectorAll(".button-icon");

buttons.forEach((button, index) => {
  button.addEventListener("click", () => {
    // Remove all active states first
    buttons.forEach((btn) => btn.classList.remove("focused-btn"));
    buttonTexts.forEach((text) => text.classList.remove("text-white"));
    buttonIcons.forEach((icon) => icon.classList.remove("text-frost"));

    // Apply to clicked element
    button.classList.add("focused-btn");
    buttonTexts[index].classList.add("text-white");
    buttonIcons[index].classList.add("text-frost");
  });
});
