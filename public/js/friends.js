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
  const nav = document.querySelector("nav");
  const linkContainer = document.querySelector(".link-container");

  linkContainer.classList.toggle("px-7");
  chevron.addEventListener("click", function () {
    nav.classList.toggle("collapsed");
    linkContainer.classList.toggle("px-7");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("chat-text").classList.remove("text-dusk");
  document.getElementById("chat-icon").classList.remove("text-frost");
  document.getElementById("chat-text").classList.add("text-blaze");
  document.getElementById("chat-icon").classList.add("text-blaze");
  document.getElementById("indicator").style.transform = "translateX(0%)";

  // Hide all content except chat
  document.getElementById("messages-content").classList.add("hidden");
  document.getElementById("friends-content").classList.add("hidden");
});
function toggleComments(button) {
  const commentsSection = button
    .closest(".bg-midnight")
    .querySelector("#comments-section");
  commentsSection.classList.toggle("hidden");
  const icon = button.querySelector("i");
  if (commentsSection.classList.contains("hidden")) {
    icon.classList.remove("fa-circle-xmark");
    icon.classList.add("fa-comment");
    button.querySelector("span").textContent = "Comment";
  } else {
    icon.classList.remove("fa-comment");
    icon.classList.add("fa-circle-xmark");
    button.querySelector("span").textContent = "Close comments";
  }
}

//to switch the content according to the tab

function switchTab(tabName, position) {
  document.querySelectorAll('[id$="-text"]').forEach((el) => {
    el.classList.remove("text-blaze");
    el.classList.add("text-dusk");
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
// Comments functionality
function toggleComments(sectionId) {
  const commentsSection = document.getElementById(sectionId);
  commentsSection.classList.toggle("hidden");
}

function checkCommentInput(input) {
  const sendBtn = input.nextElementSibling;
  if (input.value.trim().length > 0) {
    sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    sendBtn.classList.add("hover:text-blaze");
    sendBtn.disabled = false;
  } else {
    sendBtn.classList.add("opacity-50", "cursor-not-allowed");
    sendBtn.classList.remove("hover:text-blaze");
    sendBtn.disabled = true;
  }
}

function postComment(inputId, sectionId) {
  const input = document.getElementById(inputId);
  const commentText = input.value.trim();
  if (commentText) {
    // for the backend
    console.log("Posting comment:", commentText);

    // simulation
    const commentsContainer = document.querySelector(
      `#${sectionId} > div:first-child`
    );
    const newComment = document.createElement("div");
    newComment.className = "flex gap-3 mb-3";
    newComment.innerHTML = `
      <img 
        src="../assets/images/profile-picture.png" 
        alt="You" 
        class="w-10 h-10 rounded-full object-cover"
      >
      <div class="w-fit bg-lightabyss rounded-2xl p-3">
        <div class="text-slate-200 font-bold text-sm">Coco Thebest</div>
        <p class="text-azure text-sm">${commentText}</p>
        <div class="flex items-center gap-3 mt-1">
          <span class="text-dusk text-xs">Just now</span>
          <button class="text-dusk text-xs hover:text-slate-200">Like</button>
          <button class="text-dusk text-xs hover:text-slate-200">Reply</button>
        </div>
      </div>
    `;
    commentsContainer.appendChild(newComment);

    input.value = "";
    checkCommentInput(input);
  }
}

//all comment inputs
document.querySelectorAll('[id^="comment-input-"]').forEach((input) => {
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const inputId = this.id;
      const sectionId = this.closest('[id^="comments-section-"]').id;
      postComment(inputId, sectionId);
    }
  });
});

function toggleChatConversation() {
  const chat = document.getElementById("chat-conversation");
  chat.classList.toggle("hidden");
  chat.classList.toggle("flex")
  chat.classList.toggle("translate-y-full");
  chat.classList.toggle("translate-y-0");
}

function openChatConversation(contactName) {
  const chat = document.getElementById("chat-conversation");
  document.getElementById("chat-contact-name").textContent = contactName;

  // Show the chat if hidden
  if (chat.classList.contains("hidden")) {
    chat.classList.remove("hidden");
    chat.classList.add("flex")
    setTimeout(() => {
      chat.classList.remove("translate-y-full");
      chat.classList.add("translate-y-0");

    }, 10);
  }
}

function sendChatMessage() {
  const input = document.getElementById("chat-message-input");
  const message = input.value.trim();
  if (message) {
    const messagesContainer = document.getElementById("chat-messages");

    // Create sent message
    const sentMsg = document.createElement("div");
    sentMsg.className = "mb-4 flex flex-col items-end";
    sentMsg.innerHTML = `
      <div class="text-azure text-xs">You</div>
      <div class="mt-1 px-4 py-2 bg-blaze rounded-xl text-white max-w-[80%]">${message}</div>
    `;
    messagesContainer.appendChild(sentMsg);

    // Clear input
    input.value = "";

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulation reply after 1 second
    setTimeout(() => {
      const contactName =
        document.getElementById("chat-contact-name").textContent;
      const replyMsg = document.createElement("div");
      replyMsg.className = "mb-4 flex flex-col items-start";
      replyMsg.innerHTML = `
        <div class="text-azure text-xs">${contactName}</div>
        <div class="mt-1 px-4 py-2 bg-lightabyss rounded-xl text-slate-200 max-w-[80%]">
          Thanks for your message! I'll get back to you soon.
        </div>
      `;
      messagesContainer.appendChild(replyMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
  }
}

document
  .getElementById("chat-message-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });
