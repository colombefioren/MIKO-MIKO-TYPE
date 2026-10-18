import { WORDS, CODE, SYMBOLS, DIGITS } from "./words.js";

export const DIFFICULTIES = ["easy", "medium", "hard"];
export const CONTENT_TYPES = ["words", "numbers", "symbols", "code"];
export const WORD_COUNTS = [15, 30, 50];

// Words dominate the mix so a test still reads like text when extras are on.
const WEIGHTS = { words: 4, code: 2, numbers: 1, symbols: 1 };
const LENGTHS = {
  numbers: { easy: [1, 3], medium: [2, 4], hard: [3, 6] },
  symbols: { easy: [1, 1], medium: [1, 2], hard: [2, 3] },
};

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const between = ([min, max], rng) => min + Math.floor(rng() * (max - min + 1));

function randomString(alphabet, length, rng) {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rng() * alphabet.length)];
  return out;
}

const MAKERS = {
  words: (difficulty, rng) => pick(WORDS[difficulty], rng),
  code: (difficulty, rng) => pick(CODE[difficulty], rng),
  numbers: (difficulty, rng) => randomString(DIGITS, between(LENGTHS.numbers[difficulty], rng), rng),
  symbols: (difficulty, rng) => randomString(SYMBOLS, between(LENGTHS.symbols[difficulty], rng), rng),
};

function pickType(types, rng) {
  const total = types.reduce((sum, type) => sum + WEIGHTS[type], 0);
  let roll = rng() * total;
  for (const type of types) {
    roll -= WEIGHTS[type];
    if (roll < 0) return type;
  }
  return types[types.length - 1];
}

export function normalizeOptions({ difficulty, contentTypes, count }) {
  const types = CONTENT_TYPES.filter((type) => contentTypes?.includes(type));
  return {
    difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : "easy",
    contentTypes: types.length ? types : ["words"],
    count: WORD_COUNTS.includes(Number(count)) ? Number(count) : 30,
  };
}

export function generateTest(options, rng = Math.random) {
  const { difficulty, contentTypes, count } = normalizeOptions(options);
  const words = [];
  for (let attempt = 0; words.length < count && attempt < count * 10; attempt++) {
    const word = MAKERS[pickType(contentTypes, rng)](difficulty, rng);
    // Avoid the same token twice in a row.
    if (word !== words[words.length - 1]) words.push(word);
  }
  while (words.length < count) words.push(MAKERS.words(difficulty, rng));
  return words;
}
