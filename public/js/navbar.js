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

//Initially always have the type button active cause thats the first page were in
window.addEventListener("DOMContentLoaded", () => {
  highlight.style.transition = "none";
  moveHighlightTo(0);

  buttons[0].classList.add("active");
  buttonTexts[0].classList.add("text-white");
  buttonIcons[0].classList.add("text-frost");

  setTimeout(() => {
    highlight.style.transition = `transform ${MOVE_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
  }, 10);
});

// Close and open the sidebar
document.addEventListener("DOMContentLoaded", function () {
  const chevron = document.querySelector(".chevron");
  const nav = document.querySelector("nav");
  const mainElement = document.querySelector("main");
  const headerElement = document.querySelector("header");
  const linkContainer = document.querySelector(".link-container");

  chevron.addEventListener("click", function () {
    nav.classList.toggle("collapsed");
    linkContainer.classList.toggle("px-7");
    // Add blur when navabr is not collasped
    mainElement.classList.toggle("blur-sm");
    headerElement.classList.toggle("blur-sm");
  });
  // Close navbar when the user switches mode
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!nav.classList.contains("collapsed")) {
        nav.classList.add("collapsed");
        mainElement.classList.toggle("blur-sm");
        headerElement.classList.toggle("blur-sm");
        linkContainer.classList.toggle("px-7");
      }
    });
  });
});
