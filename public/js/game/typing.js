import { generateTest, normalizeOptions } from "./generator.js";
import { summarize, wordsPerMinute, correctWordChars } from "./stats.js";
import { createWordsView } from "./wordsView.js";

const MAX_EXTRA_CHARS = 8;

// Drives one typing test inside the given elements. Text goes through a hidden input so
// physical keyboards, mobile keyboards and IME all produce the same `input` events.
export function createTypingTest({ viewport, wordsEl, caret, input, onStart, onProgress, onFinish }) {
  let state;
  let sampleTimer = null;
  const view = createWordsView({ viewport, wordsEl, caret });

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
    view.render(state.targets);
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

  // Redraws one word from the state and keeps the caret where typing continues.
  function renderWord(index) {
    view.updateWord(index, {
      target: state.targets[index],
      typed: state.typed[index] ?? "",
      isDone: index < state.committed,
      isActive: index === state.index && !state.finished,
    });
  }

  function placeCaret() {
    view.moveCaret(state.index, (state.typed[state.index] ?? "").length);
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
