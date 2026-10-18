import { $ } from "../lib/dom.js";
import { errorMessage, toast } from "../lib/toast.js";
import { duration, round } from "../lib/format.js";
import { initShell } from "../ui/shell.js";
import { openAuthDialog } from "../ui/authDialog.js";
import { getAuthState, onAuthChange, refreshProfile } from "../services/auth.js";
import { getGuestResults, saveGuestResult, saveResult } from "../services/results.js";
import { createPost } from "../services/social.js";
import { createTypingTest } from "../game/typing.js";
import { invalidReason } from "../game/stats.js";
import { renderResultsChart } from "../game/chart.js";

const PREFS_KEY = "mikomiko:test-options";

const els = {
  test: $("#test"),
  config: $("#test-config"),
  viewport: $("#words-viewport"),
  words: $("#words"),
  caret: $("#caret"),
  input: $("#typing-input"),
  progress: $("#live-progress"),
  liveWpm: $("#live-wpm"),
  restart: $("#restart-btn"),
  results: $("#results"),
  next: $("#next-btn"),
  share: $("#share-btn"),
  saveLogin: $("#save-login-btn"),
  status: $("#result-status"),
};

// The last finished test, kept so a guest can save it after logging in.
let lastResult = null;

function readOptions() {
  const data = new FormData(els.config);
  return {
    difficulty: data.get("difficulty"),
    contentTypes: data.getAll("content"),
    count: Number(data.get("count")),
  };
}

function writeOptions({ difficulty, contentTypes, count }) {
  for (const input of els.config.elements) {
    if (input.name === "difficulty") input.checked = input.value === difficulty;
    if (input.name === "content") input.checked = contentTypes.includes(input.value);
    if (input.name === "count") input.checked = Number(input.value) === count;
  }
}

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY));
    if (saved) writeOptions(saved);
  } catch {
    // Use the defaults from the markup.
  }
}

function savePrefs(options) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(options));
  } catch {
    // Not critical.
  }
}

const test = createTypingTest({
  viewport: els.viewport,
  wordsEl: els.words,
  caret: els.caret,
  input: els.input,
  onStart: () => document.body.classList.add("is-typing"),
  onProgress: ({ index, total, running, wpm }) => {
    els.progress.textContent = `${index} / ${total}`;
    els.liveWpm.hidden = !running;
    els.liveWpm.textContent = `${Math.round(wpm)} wpm`;
  },
  onFinish: showResults,
});

function startNewTest({ focus = true } = {}) {
  const options = readOptions();
  // At least one content type must stay selected.
  if (!options.contentTypes.length) {
    options.contentTypes = ["words"];
    writeOptions(options);
  }
  savePrefs(options);
  lastResult = null;
  document.body.classList.remove("is-typing");
  els.results.hidden = true;
  els.test.hidden = false;
  test.reset(options);
  if (focus) test.focus();
}

function describeMode({ difficulty, count, contentTypes }) {
  return `${difficulty}, ${count} words, ${contentTypes.join(" + ")}`;
}

function bestSoFar(user, profile) {
  if (user) return Number(profile?.best_wpm ?? 0);
  return Math.max(0, ...getGuestResults().map((result) => Number(result.wpm)));
}

// Confetti from both sides of the screen when a test is finished, in the brand colours.
function celebrate({ big = false } = {}) {
  if (typeof window.confetti !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ffa62f", "#2596d1", "#a2bffe", "#ffffff"];
  const end = Date.now() + (big ? 2200 : 1000);
  (function frame() {
    window.confetti({ particleCount: big ? 4 : 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
    window.confetti({ particleCount: big ? 4 : 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

async function showResults(summary) {
  document.body.classList.remove("is-typing");
  els.test.hidden = true;
  els.results.hidden = false;

  $("#result-wpm").textContent = Math.round(summary.wpm);
  $("#result-accuracy").textContent = `${round(summary.accuracy, 1)}%`;
  $("#result-raw").textContent = Math.round(summary.rawWpm);
  $("#result-time").textContent = duration(summary.durationMs);
  const { correct, incorrect, extra, missed } = summary.chars;
  $("#result-chars").textContent = `${correct}/${incorrect}/${extra}/${missed}`;
  $("#result-mode").textContent = describeMode(summary.options);
  $("#result-pb").hidden = true;
  els.share.hidden = true;
  els.saveLogin.hidden = true;
  els.next.focus();

  renderResultsChart($("#results-chart"), summary.samples);

  const invalid = invalidReason(summary);
  if (invalid) {
    els.status.textContent = invalid;
    return;
  }

  lastResult = {
    wpm: summary.wpm,
    rawWpm: summary.rawWpm,
    accuracy: summary.accuracy,
    difficulty: summary.options.difficulty,
    wordCount: summary.options.count,
    contentTypes: summary.options.contentTypes,
    durationMs: summary.durationMs,
    savedId: null,
  };

  const { user, profile } = getAuthState();
  const previousBest = bestSoFar(user, profile);
  const hadHistory = user ? Number(profile?.tests_count ?? 0) > 0 : getGuestResults().length > 0;
  const isPersonalBest = hadHistory && summary.wpm > previousBest;
  $("#result-pb").hidden = !isPersonalBest;
  celebrate({ big: isPersonalBest });

  if (user) await saveForUser();
  else {
    saveGuestResult(lastResult);
    els.status.textContent = "Saved in this browser. Log in to keep your results and join the leaderboard.";
    els.saveLogin.hidden = false;
  }
}

async function saveForUser() {
  if (!lastResult || lastResult.savedId) return;
  els.status.textContent = "Saving your result";
  try {
    const row = await saveResult(lastResult);
    lastResult.savedId = row.id;
    els.status.textContent = "Saved to your profile.";
    els.share.hidden = false;
    els.saveLogin.hidden = true;
    refreshProfile();
  } catch (error) {
    console.error("Could not save result", error);
    els.status.textContent = `Not saved: ${errorMessage(error)}`;
  }
}

async function shareResult() {
  const { user } = getAuthState();
  if (!user || !lastResult?.savedId) return;
  els.share.disabled = true;
  try {
    await createPost({ userId: user.id, content: "", resultId: lastResult.savedId });
    toast("Shared with the community.", "success");
    els.share.hidden = true;
    els.status.textContent = "Shared. Find it in the Community feed.";
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    els.share.disabled = false;
  }
}

// Wiring

els.config.addEventListener("change", (event) => {
  // Keep at least one content type checked.
  if (event.target.name === "content" && !readOptions().contentTypes.length) event.target.checked = true;
  startNewTest();
});

els.restart.addEventListener("click", () => startNewTest());
els.next.addEventListener("click", () => startNewTest());
els.share.addEventListener("click", shareResult);
els.saveLogin.addEventListener("click", () => openAuthDialog("login"));

els.viewport.addEventListener("click", () => test.focus());
els.input.addEventListener("focus", () => els.viewport.classList.add("is-focused"));
els.input.addEventListener("blur", () => els.viewport.classList.remove("is-focused"));

els.input.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    startNewTest();
  }
});

document.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const nothingFocused = !active || active === document.body;

  if (!els.results.hidden) {
    if (event.key === "Enter" && nothingFocused) startNewTest();
    return;
  }
  // Typing anywhere on the page goes to the test, but never steals keys from other controls.
  if (nothingFocused && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    test.focus();
  }
});

// A guest who logs in on the results screen gets the finished test saved.
onAuthChange(({ user }) => {
  if (user && lastResult && !lastResult.savedId && !els.results.hidden) saveForUser();
});

loadPrefs();
startNewTest({ focus: true });
initShell("type");
