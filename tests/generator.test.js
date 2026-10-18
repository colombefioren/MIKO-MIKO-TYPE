import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTest, normalizeOptions } from "../public/js/game/generator.js";
import { CODE, WORDS } from "../public/js/game/words.js";

// Small deterministic generator so tests do not depend on Math.random.
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("generates the requested number of words without spaces", () => {
  for (const count of [15, 30, 50]) {
    const words = generateTest({ difficulty: "hard", contentTypes: ["words", "numbers", "symbols", "code"], count }, seeded(count));
    assert.equal(words.length, count);
    for (const word of words) {
      assert.ok(word.length > 0);
      assert.ok(!/\s/.test(word), `"${word}" contains whitespace`);
    }
  }
});

test("never repeats the same token twice in a row", () => {
  const words = generateTest({ difficulty: "easy", contentTypes: ["words"], count: 50 }, seeded(7));
  for (let i = 1; i < words.length; i++) assert.notEqual(words[i], words[i - 1]);
});

test("uses only the selected pools", () => {
  const words = generateTest({ difficulty: "medium", contentTypes: ["words"], count: 50 }, seeded(3));
  for (const word of words) assert.ok(WORDS.medium.includes(word));
  const numbers = generateTest({ difficulty: "easy", contentTypes: ["numbers"], count: 30 }, seeded(5));
  for (const token of numbers) assert.match(token, /^\d{1,3}$/);
});

test("no dictionary entry contains whitespace", () => {
  for (const pool of [...Object.values(WORDS), ...Object.values(CODE)]) {
    for (const entry of pool) assert.ok(!/\s/.test(entry), `"${entry}" contains whitespace`);
  }
});

test("normalizeOptions falls back to safe defaults", () => {
  assert.deepEqual(normalizeOptions({ difficulty: "insane", contentTypes: [], count: 999 }), {
    difficulty: "easy",
    contentTypes: ["words"],
    count: 30,
  });
});
