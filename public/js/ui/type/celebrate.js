// Confetti from both sides of the screen when a test is finished, in the brand colours.
const COLORS = ["#ffa62f", "#2596d1", "#a2bffe", "#ffffff"];

export function celebrate({ big = false } = {}) {
  if (typeof window.confetti !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const end = Date.now() + (big ? 2200 : 1000);
  const particleCount = big ? 4 : 2;
  (function frame() {
    window.confetti({ particleCount, angle: 60, spread: 55, origin: { x: 0 }, colors: COLORS });
    window.confetti({ particleCount, angle: 120, spread: 55, origin: { x: 1 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
