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
  const nav = document.querySelector("nav");;
  const linkContainer = document.querySelector(".link-container");

  linkContainer.classList.toggle("px-7");
  chevron.addEventListener("click", function () {
    nav.classList.toggle("collapsed");
    linkContainer.classList.toggle("px-7");
  });
});

document.addEventListener('DOMContentLoaded', function() {
    
    document.getElementById('chat-text').classList.remove('text-dusk');
    document.getElementById('chat-icon').classList.remove('text-frost');
    document.getElementById('chat-text').classList.add('text-blaze');
    document.getElementById('chat-icon').classList.add('text-blaze');
    document.getElementById('indicator').style.transform = 'translateX(0%)';
    
    // Hide all content except chat
    document.getElementById('messages-content').classList.add('hidden');
    document.getElementById('friends-content').classList.add('hidden');
});


function switchTab(tabName, position) {
  document.querySelectorAll('[id$="-text"]').forEach((el) => {
    el.classList.remove("text-blaze");
    el.classList.add("text-dusk")
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
