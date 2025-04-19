// Loading utilities
export function showLoading(selector = "body") {
  const element = document.querySelector(selector);
  if (!element) return;

  const loader = document.createElement("div");
  loader.className = "loading-overlay";
  loader.innerHTML = `
    <div class="flex items-center justify-center h-full">
      <div class="loading-spinner"></div>
    </div>
  `;

  element.style.position = "relative";
  loader.style.position = "absolute";
  loader.style.top = "0";
  loader.style.left = "0";
  loader.style.right = "0";
  loader.style.bottom = "0";
  loader.style.backgroundColor = "rgba(15, 23, 42, 0.7)";
  loader.style.zIndex = "50";
  loader.style.display = "flex";
  loader.style.alignItems = "center";
  loader.style.justifyContent = "center";

  element.appendChild(loader);
}

export function hideLoading(selector = "body") {
  const element = document.querySelector(selector);
  if (!element) return;

  const loader = element.querySelector(".loading-overlay");
  if (loader) {
    loader.remove();
  }
}

// Show loading for specific buttons
export function showButtonLoading(button) {
  button.setAttribute("data-original-text", button.innerHTML);
  button.innerHTML = `
    <div class="flex items-center justify-center gap-2">
      <div class="loading-spinner !h-4 !w-4 !border-t-2 !border-b-2"></div>
      <span>Loading...</span>
    </div>
  `;
  button.disabled = true;
}

export function hideButtonLoading(button) {
  const originalText = button.getAttribute("data-original-text");
  if (originalText) {
    button.innerHTML = originalText;
  }
  button.disabled = false;
}
export function showNotification(message, type = "success") {
  const notification = document.getElementById("notification-result");
  const messageEl = document.getElementById("notification-message-result");
  const notificationText = document.getElementById("notification-text");

  messageEl.textContent = message;

  // Show notification
  notification.classList.remove("hidden");
  notification.classList.add("flex");

  // Add type-specific color
  if (type === "success") {
    notificationText.classList.add("bg-azure");
  } else if (type === "error") {
    notificationText.classList.add("bg-red-500");
  } else {
    notificationText.classList.add("bg-blaze");
  }

  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.add("hidden");
    notification.classList.remove("flex");
  }, 6000);
}
