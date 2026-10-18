import { $ } from "../lib/dom.js";
import { onAuthChange } from "../services/auth.js";
import { createTypingTest } from "../game/typing.js";
import { openAuthDialog } from "../ui/auth/dialog.js";
import { initShell } from "../ui/shell/index.js";
import { createOptions } from "../ui/type/options.js";
import { createResultSaving } from "../ui/type/resultSaving.js";
import { createResultsView } from "../ui/type/resultsView.js";

const els = {
  test: $("#test"),
  viewport: $("#words-viewport"),
  input: $("#typing-input"),
  progress: $("#live-progress"),
  liveWpm: $("#live-wpm"),
};

const options = createOptions($("#test-config"));
const results = createResultsView($("#results"));
const saving = createResultSaving(results);

const test = createTypingTest({
  viewport: els.viewport,
  wordsEl: $("#words"),
  caret: $("#caret"),
  input: els.input,
  onStart: () => document.body.classList.add("is-typing"),
  onProgress: ({ index, total, running, wpm }) => {
    els.progress.textContent = `${index} / ${total}`;
    els.liveWpm.hidden = !running;
    els.liveWpm.textContent = `${Math.round(wpm)} wpm`;
  },
  onFinish: (summary) => {
    document.body.classList.remove("is-typing");
    els.test.hidden = true;
    results.show(summary);
    saving.handleFinished(summary);
  },
});

function startNewTest() {
  saving.reset();
  document.body.classList.remove("is-typing");
  results.hide();
  els.test.hidden = false;
  test.reset(options.current());
  test.focus();
}

$("#test-config").addEventListener("change", startNewTest);
$("#restart-btn").addEventListener("click", startNewTest);
$("#next-btn").addEventListener("click", startNewTest);
results.buttons.share.addEventListener("click", saving.share);
results.buttons.saveLogin.addEventListener("click", () => openAuthDialog("login"));

els.viewport.addEventListener("click", () => test.focus());
els.input.addEventListener("focus", () => els.viewport.classList.add("is-focused"));
els.input.addEventListener("blur", () => els.viewport.classList.remove("is-focused"));
els.input.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  startNewTest();
});

document.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const nothingFocused = !active || active === document.body;
  if (results.visible) {
    if (event.key === "Enter" && (nothingFocused || active === $("#results"))) startNewTest();
    return;
  }
  // Typing anywhere on the page goes to the test, but never steals keys from other controls.
  if (nothingFocused && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) test.focus();
});

onAuthChange(({ user }) => {
  if (user && results.visible) saving.saveAfterLogin();
});

options.restore();
startNewTest();
initShell("type");
