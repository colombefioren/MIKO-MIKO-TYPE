import { supabase } from "./database.js";

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
  moveHighlightTo(3);

  buttons[3].classList.add("active");
  buttonTexts[3].classList.add("text-white");
  buttonIcons[3].classList.add("text-frost");

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

document.querySelectorAll(".category-item").forEach((item) => {
  item.addEventListener("click", function () {
    itemActive = document.querySelector(".activeButton");
    itemActive.classList.remove("text-strongAzure");
    itemActive.classList.remove("bg-buttonBlue");
    itemActive.classList.remove("activeButton");
    itemActive.classList.add("text-slate-200");

    this.classList.remove("text-slate-200");
    this.classList.add("text-strongAzure");
    this.classList.add("text-strongAzure");
    this.classList.add("bg-buttonBlue");
    this.classList.add("activeButton");
  });
});

async function loadLeaderboard() {
  try {
    // Fetch top 10 profiles ordered by wpm_avg
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, wpm_avg, accuracy_avg")
      .order("wpm_avg", { ascending: false })
      .limit(10);

    if (error) throw error;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let currentUserProfile = null;
    let currentUserRank = null;

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, wpm_avg, accuracy_avg")
        .eq("id", user.id)
        .single();

      if (!profileError && profile) {
        currentUserProfile = profile;

        // Get current user's rank
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gt("wpm_avg", profile.wpm_avg);

        currentUserRank = count + 1; // +1 because count is number of users above
      }
    }

    const container = document.getElementById("leaderboard-container");
    container.innerHTML = "";

    // Create leaderboard rows for top 10
    profiles.forEach((profile, index) => {
      const row = document.createElement("div");
      row.className = "grid grid-cols-12 items-center p-4 leaderboard-row";

      let rankClass = "text-gray-300";
      if (index === 0) rankClass = "text-yellow-400";
      else if (index === 1) rankClass = "text-gray-300";
      else if (index === 2) rankClass = "text-amber-500";

      row.innerHTML = `
          <div class="col-span-1 text-center ${rankClass} font-bold">${
        index + 1
      }</div>
          <div class="col-span-6 flex items-center gap-4">
            <img src="${
              profile.avatar_url || "../public/assets/images/blank-profile.png"
            }" 
                 class="w-12 h-12 rounded-full object-cover" />
            <div>
              <div class="text-white font-medium text-lg">${
                profile.username
              }</div>
              <div class="text-azure text-sm">@${profile.username
                .toLowerCase()
                .split(" ")
                .join("")}</div>
            </div>
          </div>
          <div class="col-span-2 text-right text-white font-bold text-lg">
            ${profile.wpm_avg || 0}
          </div>
          <div class="col-span-2 text-right text-green-400 text-lg">
            ${profile.accuracy_avg || 0}%
          </div>
          <div class="col-span-1 text-right text-azure text-lg">
            ${((profile.wpm_avg || 0) * 1.04).toFixed()}
          </div>
        `;

      container.appendChild(row);
    });

    console.log(currentUserRank);

    if (
      currentUserProfile &&
      (currentUserRank > 10 || currentUserRank === null)
    ) {
      const currentUserRow = document.createElement("div");
      currentUserRow.className =
        "grid grid-cols-12 items-center p-4 bg-lightabyss/30 flex justify-end";

      currentUserRow.innerHTML = `
          <div class="col-span-1 text-center text-blaze font-bold text-lg">
            ${currentUserRank || "--"}
          </div>
          <div class="col-span-6 flex items-center gap-4">
            <img src="${
              currentUserProfile.avatar_url ||
              "../public/assets/images/profile-picture.png"
            }" 
                 class="w-12 h-12 rounded-full object-cover" />
            <div>
              <div class="text-white font-medium text-lg">${
                currentUserProfile.username
              }</div>
              <div class="text-azure text-sm">@${currentUserProfile.username.toLowerCase()}</div>
            </div>
          </div>
          <div class="col-span-2 text-right text-blaze font-bold text-lg">
            ${Math.round(currentUserProfile.wpm_avg || 0)}
          </div>
          <div class="col-span-2 text-right text-green-400 text-lg">
            ${(currentUserProfile.accuracy_avg || 0).toFixed(1)}%
          </div>
          <div class="col-span-1 text-right text-azure text-lg">
            ${Math.round((currentUserProfile.wpm_avg || 0) * 1.04)}
          </div>
        `;

      container.appendChild(currentUserRow);
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadLeaderboard);
