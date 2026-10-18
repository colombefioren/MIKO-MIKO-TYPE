// Pure scoring functions. WPM uses the standard 5 characters per word.

const CHARS_PER_WORD = 5;
const round2 = (value) => Math.round(value * 100) / 100;

export function wordsPerMinute(chars, ms) {
  if (ms <= 0) return 0;
  return round2(chars / CHARS_PER_WORD / (ms / 60_000));
}

export function accuracy(correctKeys, incorrectKeys) {
  const total = correctKeys + incorrectKeys;
  return total === 0 ? 0 : round2((correctKeys / total) * 100);
}

// Compares what was typed with the targets, word by word.
// `committed` is how many words were finished with a space (or by completing the test).
export function charBreakdown(targets, typed, committed) {
  const result = { correct: 0, incorrect: 0, extra: 0, missed: 0 };
  typed.forEach((word, index) => {
    const target = targets[index] ?? "";
    const isDone = index < committed;
    for (let i = 0; i < Math.max(word.length, target.length); i++) {
      if (i < word.length && i < target.length) {
        if (word[i] === target[i]) result.correct++;
        else result.incorrect++;
      } else if (i >= target.length) {
        result.extra++;
      } else if (isDone) {
        result.missed++;
      }
    }
  });
  return result;
}

// Characters that count toward WPM: fully correct words plus the spaces after them.
export function correctWordChars(targets, typed, committed) {
  let chars = 0;
  for (let i = 0; i < typed.length; i++) {
    const exact = typed[i] === targets[i];
    const isPartial = i >= committed;
    if (exact) chars += targets[i].length + (i < committed && i < targets.length - 1 ? 1 : 0);
    else if (isPartial) {
      // The word in progress counts while it is still a correct prefix.
      if (targets[i]?.startsWith(typed[i])) chars += typed[i].length;
    }
  }
  return chars;
}

export function rawChars(typed, committed) {
  const typedChars = typed.reduce((sum, word) => sum + word.length, 0);
  const spaces = Math.max(0, Math.min(committed, typed.length - 1));
  return typedChars + spaces;
}

export function summarize({ targets, typed, committed, correctKeys, incorrectKeys, durationMs }) {
  return {
    wpm: wordsPerMinute(correctWordChars(targets, typed, committed), durationMs),
    rawWpm: wordsPerMinute(rawChars(typed, committed), durationMs),
    accuracy: accuracy(correctKeys, incorrectKeys),
    chars: charBreakdown(targets, typed, committed),
    durationMs,
  };
}

// Results below this accuracy are shown but not saved.
export const MIN_VALID_ACCURACY = 50;

// Above these speeds a result is almost certainly not typed by hand.
export const MAX_WPM = 350;
export const MAX_RAW_WPM = 400;

export function invalidReason(summary) {
  if (summary.durationMs < 1000) return "The test was too short to count.";
  if (summary.accuracy < MIN_VALID_ACCURACY) return `Accuracy below ${MIN_VALID_ACCURACY}% is not saved.`;
  if (summary.wpm <= 0) return "No correct words were typed.";
  if (summary.wpm > MAX_WPM || summary.rawWpm > MAX_RAW_WPM) return "That speed is beyond the allowed limit.";
  return null;
}
