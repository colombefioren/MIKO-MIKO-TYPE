import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accuracy,
  charBreakdown,
  correctWordChars,
  invalidReason,
  rawChars,
  summarize,
  wordsPerMinute,
} from "../public/js/game/stats.js";

test("wordsPerMinute uses 5 characters per word", () => {
  assert.equal(wordsPerMinute(50, 60_000), 10);
  assert.equal(wordsPerMinute(25, 30_000), 10);
  assert.equal(wordsPerMinute(10, 0), 0);
});

test("accuracy is correct keystrokes over all keystrokes", () => {
  assert.equal(accuracy(9, 1), 90);
  assert.equal(accuracy(0, 0), 0);
  assert.equal(accuracy(2, 1), 66.67);
});

test("correctWordChars counts exact words and the spaces between them", () => {
  const targets = ["the", "quick", "fox"];
  // "the " (4) + "quick" wrong (0) + "fox" final word without space (3)
  assert.equal(correctWordChars(targets, ["the", "quikc", "fox"], 3), 7);
  // A correct prefix of the word in progress counts.
  assert.equal(correctWordChars(targets, ["the", "qu"], 1), 6);
  // A wrong word in progress does not.
  assert.equal(correctWordChars(targets, ["the", "qx"], 1), 4);
});

test("rawChars counts every typed character and committed spaces", () => {
  assert.equal(rawChars(["the", "quikc", "fo"], 2), 12);
  assert.equal(rawChars(["the"], 1), 3);
});

test("charBreakdown separates correct, incorrect, extra and missed", () => {
  const result = charBreakdown(["cat", "dog"], ["cax", "dogs"], 2);
  assert.deepEqual(result, { correct: 5, incorrect: 1, extra: 1, missed: 0 });
  const skipped = charBreakdown(["house", "dog"], ["ho", "d"], 1);
  assert.deepEqual(skipped, { correct: 3, incorrect: 0, extra: 0, missed: 3 });
});

test("summarize combines the stats of a finished test", () => {
  const summary = summarize({
    targets: ["hello", "world"],
    typed: ["hello", "world"],
    committed: 2,
    correctKeys: 11,
    incorrectKeys: 0,
    durationMs: 6_000,
  });
  assert.equal(summary.wpm, 22);
  assert.equal(summary.rawWpm, 22);
  assert.equal(summary.accuracy, 100);
});

test("invalidReason rejects short, inaccurate or impossible results", () => {
  const base = { wpm: 80, rawWpm: 85, accuracy: 95, durationMs: 20_000 };
  assert.equal(invalidReason(base), null);
  assert.match(invalidReason({ ...base, durationMs: 400 }), /too short/);
  assert.match(invalidReason({ ...base, accuracy: 40 }), /Accuracy/);
  assert.match(invalidReason({ ...base, wpm: 500 }), /limit/);
});
