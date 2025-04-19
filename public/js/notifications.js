import { supabase } from "./database.js";
import { getCurrentUser } from "./auth.js";

let user = null;

document.addEventListener("DOMContentLoaded", async () => {
  user = await getCurrentUser();
  if (user) {
    await loadNotifications();
    setupRealtimeNotifications();
  }
});




export async function loadNotifications() {
  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(
        `
        *,
        sender:sender_id (id, username, avatar_url)
      `
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    renderNotifications(notifications || []);
  } catch (error) {
    console.error("Error loading notifications:", error);
    showError("Failed to load notifications");
  }
}

function renderNotifications(notifications) {
  const container = document.getElementById("notifications-container");
  container.innerHTML = "";

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-bell-slash text-5xl text-dusk mb-4"></i>
        <h3 class="text-slate-200 font-bold text-lg mb-2">No notifications</h3>
        <p class="text-azure">Your notifications will appear here</p>
      </div>
    `;
    return;
  }

  notifications.forEach((notification) => {
    const notificationElement = document.createElement("div");
    notificationElement.className =
      "bg-midnight border border-lightabyss w-full rounded-3xl py-4 px-6 flex items-start gap-3";

    let content = "";
    switch (notification.type) {
      case "friend_request":
        content = `
          <img src="${
            notification.sender.avatar_url ||
            "../public/assets/images/blank-profile.png"
          }"
               alt="Profile Pic" class="rounded-full w-12 h-12 object-cover">
          <div class="flex-1">
            <div class="text-slate-200 text-[14px] font-bold">
              ${notification.sender.username}
              <span class="text-dusk font-normal">sent you a friend request</span>
            </div>
            <div class="text-dusk text-xs mt-2">${formatNotificationDate(
              notification.created_at
            )}</div>
          </div>
        `;
        break;

      default:
        content = `
          <div class="bg-${
            notification.metadata?.color || "frost"
          }/20 rounded-full w-12 h-12 flex items-center justify-center">
            <i class="fas fa-${notification.metadata?.icon || "bell"} text-${
          notification.metadata?.color || "frost"
        } text-xl"></i>
          </div>
          <div class="flex-1">
            <div class="text-slate-200 text-[14px] font-bold">
              ${notification.title || "Notification"}
            </div>
            <div class="text-azure text-[12px] mt-1">
              ${notification.content}
            </div>
            <div class="text-dusk text-xs mt-2">${formatNotificationDate(
              notification.created_at
            )}</div>
          </div>
        `;
    }

    notificationElement.innerHTML += content;
    container.appendChild(notificationElement);
  });
}

export function setupRealtimeNotifications() {
  const existingChannels = supabase.getChannels();
  existingChannels.forEach(channel => {
    if (channel.topic === 'realtime:public:notifications') {
      supabase.removeChannel(channel);
    }
  });

  const channel = supabase
    .channel('notifications_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      },
      async (payload) => {
        await loadNotifications();
        
        if (payload.eventType === 'INSERT') {
          showNewNotificationIndicator();
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Add this helper function
function showNewNotificationIndicator() {
  const badge = document.getElementById('notification-badge');
  if (badge) {
    badge.classList.remove('hidden');
    badge.classList.add('animate-pulse');
    
    // Stop animation after 2 seconds
    setTimeout(() => {
      badge.classList.remove('animate-pulse');
    }, 2000);
  }
}

function formatNotificationDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
