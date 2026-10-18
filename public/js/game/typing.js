import { h } from "../lib/dom.js";
import { generateTest, normalizeOptions } from "./generator.js";
import { summarize, wordsPerMinute, correctWordChars } from "./stats.js";

const MAX_EXTRA_CHARS = 8;
const VISIBLE_LINES = 3;

// Drives one typing test inside the given elements. Text goes through a hidden input so
// physical keyboards, mobile keyboards and IME all produce the same `input` events.
export function createTypingTest({ viewport, wordsEl, caret, input, onStart, onProgress, onFinish }) {
  let state;
  let wordEls = [];
  let sampleTimer = null;
  let lineStep = 0;

  function reset(options) {
    clearInterval(sampleTimer);
    const normalized = normalizeOptions(options);
    state = {
      options: normalized,
      targets: generateTest(normalized),
      typed: [""],
      index: 0,
      committed: 0,
      correctKeys: 0,
      incorrectKeys: 0,
      startedAt: null,
      finished: false,
      samples: [],
      secondKeys: 0,
      secondErrors: 0,
      lastSampleAt: 0,
    };
    input.value = "";
    renderWords();
    onProgress?.(progress());
  }

  function progress() {
    const elapsed = state.startedAt ? performance.now() - state.startedAt : 0;
    return {
      index: state.index,
      total: state.targets.length,
      running: Boolean(state.startedAt) && !state.finished,
      wpm: elapsed > 0 ? wordsPerMinute(correctWordChars(state.targets, state.typed, state.committed), elapsed) : 0,
    };
  }

  function renderWords() {
    wordEls = state.targets.map((word) =>
      h("div.word", {}, [...word].map((char) => h("span.letter", {}, char)))
    );
    wordsEl.replaceChildren(...wordEls, caret);
    wordsEl.style.transform = "";
    measure();
  }

  // Line height and viewport size depend on the font, so they are measured, not hard-coded.
  function measure() {
    const first = wordEls[0];
    if (!first) return;
    const rowGap = parseFloat(getComputedStyle(wordsEl).rowGap) || 0;
    lineStep = first.offsetHeight + rowGap;
    viewport.style.setProperty("--words-height", `${lineStep * VISIBLE_LINES - rowGap}px`);
    caret.style.height = `${first.offsetHeight}px`;
    placeCaret();
  }

  function renderWord(index) {
    const target = state.targets[index];
    const typed = state.typed[index] ?? "";
    const el = wordEls[index];
    const letters = [...el.children];

    letters.forEach((letter, i) => {
      if (i >= target.length) {
        letter.remove();
        return;
      }
      letter.classList.toggle("is-correct", i < typed.length && typed[i] === target[i]);
      letter.classList.toggle("is-incorrect", i < typed.length && typed[i] !== target[i]);
    });
    for (let i = target.length; i < typed.length; i++) {
      el.append(h("span.letter.is-extra", {}, typed[i]));
    }

    const isPast = index < state.committed;
    el.classList.toggle("has-error", isPast && typed !== target);
    el.classList.toggle("is-active", index === state.index && !state.finished);
  }

  function placeCaret() {
    const el = wordEls[state.index];
    if (!el) return;
    const typedLength = (state.typed[state.index] ?? "").length;
    const letters = el.children;
    // Letters are positioned relative to the words container (their offsetParent), not the word.
    let x;
    if (typedLength < letters.length) x = letters[typedLength].offsetLeft;
    else {
      const last = letters[letters.length - 1];
      x = last ? last.offsetLeft + last.offsetWidth : el.offsetLeft;
    }

    // Keep the active word on the second visible line.
    const shift = Math.max(0, el.offsetTop - lineStep);
    wordsEl.style.transform = shift ? `translateY(${-shift}px)` : "";
    caret.style.transform = `translate(${x}px, ${el.offsetTop}px)`;
  }

  function start() {
    state.startedAt = performance.now();
    state.lastSampleAt = state.startedAt;
    sampleTimer = setInterval(takeSample, 1000);
    onStart?.();
  }

  function takeSample() {
    const now = performance.now();
    const elapsed = now - state.startedAt;
    state.samples.push({
      second: Math.round(elapsed / 100) / 10,
      wpm: wordsPerMinute(correctWordChars(state.targets, state.typed, state.committed), elapsed),
      raw: wordsPerMinute(state.secondKeys, now - state.lastSampleAt),
      errors: state.secondErrors,
    });
    state.lastSampleAt = now;
    state.secondKeys = 0;
    state.secondErrors = 0;
    onProgress?.(progress());
  }

  function countKey(correct) {
    if (correct) state.correctKeys++;
    else {
      state.incorrectKeys++;
      state.secondErrors++;
    }
    state.secondKeys++;
  }

  function applyValue(value) {
    const target = state.targets[state.index];
    const previous = state.typed[state.index];
    const next = value.slice(0, target.length + MAX_EXTRA_CHARS);
    if (next !== value) input.value = next;

    let common = 0;
    while (common < previous.length && common < next.length && previous[common] === next[common]) common++;
    for (let i = common; i < next.length; i++) countKey(next[i] === target[i]);

    state.typed[state.index] = next;
    renderWord(state.index);
    placeCaret();

    const isLastWord = state.index === state.targets.length - 1;
    if (isLastWord && next === target) finish();
  }

  function commitWord() {
    const target = state.targets[state.index];
    const typed = state.typed[state.index];
    countKey(typed.length === target.length);
    state.committed = state.index + 1;

    if (state.index === state.targets.length - 1) {
      finish();
      return;
    }
    state.index++;
    state.typed.push("");
    renderWord(state.index - 1);
    renderWord(state.index);
    placeCaret();
    onProgress?.(progress());
  }

  // Backspace on an empty word steps back into the previous word if it has a mistake.
  function stepBack() {
    const previous = state.index - 1;
    if (previous < 0 || state.typed[previous] === state.targets[previous]) return false;
    state.typed.pop();
    state.index = previous;
    state.committed = previous;
    input.value = state.typed[previous];
    renderWord(previous + 1);
    renderWord(previous);
    placeCaret();
    onProgress?.(progress());
    return true;
  }

  function finish() {
    if (state.finished) return;
    clearInterval(sampleTimer);
    const durationMs = performance.now() - state.startedAt;
    if (durationMs - (state.samples.at(-1)?.second ?? 0) * 1000 > 300) takeSample();
    state.finished = true;
    state.committed = state.targets.length;
    renderWord(state.index);
    input.blur();

    onFinish?.({
      ...summarize({ ...state, durationMs }),
      samples: state.samples,
      options: state.options,
    });
  }

  input.addEventListener("input", () => {
    if (state.finished) return;
    const value = input.value;
    if (!state.startedAt && value.trim()) start();

    if (value.includes(" ")) {
      const word = value.slice(0, value.indexOf(" "));
      input.value = "";
      // A space on an empty word does nothing, like on a real typing test.
      if (state.typed[state.index] === "" && word === "") return;
      if (word !== state.typed[state.index]) applyValue(word);
      if (!state.finished) commitWord();
      return;
    }
    applyValue(value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && input.value === "" && !state.finished) {
      if (stepBack()) event.preventDefault();
    }
    // Keep the caret at the end: the test has no concept of moving inside a word.
    if (["ArrowLeft", "ArrowRight", "Home", "End", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
    }
  });

  new ResizeObserver(() => measure()).observe(viewport);
  document.fonts?.ready.then(measure);

  return {
    reset,
    focus: () => input.focus({ preventScroll: true }),
    get options() {
      return state.options;
    },
    get isRunning() {
      return Boolean(state.startedAt) && !state.finished;
    },
  };
}
