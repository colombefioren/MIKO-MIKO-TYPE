// export function showLoading(toLoad) {
//   switch (toLoad) {
//     case "post":
//       document.getElementById("post-loading").classList.remove("hidden");
//   }
// }

// export function hideLoading(toLoad) {
//   switch (toLoad) {
//     case "post":
//       document.getElementById("post-loading").classList.add("hidden");
//   }
// }

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
