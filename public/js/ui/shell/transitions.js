// Pages restored from the back/forward cache appear without a load, so replay the fade-in.
export function replayEntranceOnRestore() {
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || !document.documentElement.classList.contains("no-view-transitions")) return;
    const main = document.querySelector("main");
    if (!main) return;
    main.style.animation = "none";
    main.getBoundingClientRect();
    main.style.animation = "";
  });
}
