import { getCurrentUser } from "./auth.js";
import { supabase } from "./database.js";
import { createPost } from "./socials.js";

// Cache DOM elements
const elements = {
  modeForm: document.getElementById("mode-form"),
  wordDisplay: document.getElementById("word-display"),
  inputField: document.getElementById("input-field"),
  results: document.getElementById("results"),
  totalResult: document.getElementById("total_result"),
  cursor: document.getElementById("typing-cursor"),
  textField: document.getElementById("text-field"),
  pointerFocus: document.getElementById("pointer-focus"),
  difficultyInputs: document.querySelectorAll(
    'input[type="radio"][name="mode"]'
  ),
  contentCheckboxes: document.querySelectorAll('input[name="content-type"]'),
};

// Game state
const state = {
  startTime: null,
  previousEndTime: null,
  currentWordIndex: 0,
  wordsToType: [],
  charSpans: [],
  totalStats: { wpm: 0, accuracy: 0, count: 0, mode: "" },
  wordCount: 5,
  activeListeners: new Set(),
};

// Content dictionaries with memoization
const contentDictionaries = {
  words: {
    easy: ["apple", "banana", "grape", "orange", "cherry"],
    medium: ["keyboard", "monitor", "printer", "charger", "battery"],
    hard: [
      "synchronize",
      "complicated",
      "development",
      "extravagant",
      "misconception",
    ],
  },
  symbols: [
    "!",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    "-",
    "_",
    "+",
    "=",
    "{",
    "}",
    "[",
    "]",
    "|",
    "\\",
    ":",
    ";",
    '"',
    "'",
    "<",
    ">",
    ",",
    ".",
    "?",
    "/",
  ],
  numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  code: {
    easy: [
      "let",
      "var",
      "const",
      "if",
      "else",
      "true",
      "false",
      "null",
      "undefined",
      "return",
      "function",
      "for",
      "while",
      "i++",
      "i--",
      "i+=1",
      "i-=1",
      "x+y",
      "x-y",
      "x*y",
      "x/y",
      "x==y",
      "x!=y",
      "x>y",
      "x<y",
      "&&",
      "||",
      "!x",
      "console.log()",
      "alert()",
      "parseInt()",
      "push()",
      "pop()",
      "shift()",
      "unshift()",
      "length",
      "toString()",
      "join()",
      "split()",
    ],
    medium: [
      "array",
      "object",
      "string",
      "number",
      "boolean",
      "map()",
      "filter()",
      "reduce()",
      "forEach()",
      "find()",
      "some()",
      "every()",
      "includes()",
      "indexOf()",
      "i*=2",
      "i/=2",
      "++i",
      "--i",
      "x%y",
      "x===y",
      "x!==y",
      "x>=y",
      "x<=y",
      "x&&y||z",
      "!x&&y",
      "x??y",
      "x?y:z",
      "substring()",
      "slice()",
      "splice()",
      "concat()",
      "charAt()",
      "trim()",
      "toLowerCase()",
      "toUpperCase()",
      "Math.floor()",
      "Math.ceil()",
      "Math.round()",
      "Math.random()",
      "Object.keys()",
      "Object.values()",
      "Array.isArray()",
      "then()",
      "catch()",
      "finally()",
      "setTimeout()",
      "setInterval()",
      "querySelector()",
      "getElementById()",
    ],
    hard: [
      "async",
      "await",
      "yield",
      "x**=y",
      "x|=y",
      "x&=y",
      "x^=y",
      "x<<=y",
      "x>>=y",
      "x>>>=y",
      "x&y",
      "x|y",
      "x^y",
      "~x",
      "x<<y",
      "x>>y",
      "x>>>y",
      "x**y",
      "Promise.all()",
      "Promise.race()",
      "Promise.resolve()",
      "Promise.reject()",
      "bind()",
      "call()",
      "apply()",
      "Object.freeze()",
      "Object.seal()",
      "Object.create()",
      "Object.defineProperty()",
      "Object.assign()",
      "Symbol.iterator",
      "Symbol.species",
      "Array.from()",
      "Array.of()",
      "requestAnimationFrame()",
      "Object.prototype",
      "Function.prototype",
      "Array.prototype",
      "String.prototype",
      "Reflect.get()",
      "Reflect.set()",
      "Reflect.has()",
      "Reflect.apply()",
    ],
  },
};

// Utility functions
const utils = {
  debounce: (func, wait) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  getRandomFromArray: (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  getCurrentDifficulty: () => {
    const checkedDifficulty = document.querySelector(
      'input[type="radio"][name="mode"]:checked'
    );
    return checkedDifficulty ? checkedDifficulty.value : "easy";
  },

  getSelectedContentTypes: () => {
    return Array.from(
      document.querySelectorAll('input[name="content-type"]:checked')
    ).map((checkbox) => checkbox.value);
  },

  ensureContentTypeSelected: () => {
    const selectedTypes = utils.getSelectedContentTypes();
    if (selectedTypes.length === 0) {
      document.getElementById("words").checked = true;
      return ["words"];
    }
    return selectedTypes;
  },
};

// Word selection with memoization
const wordSelection = (() => {
  const cache = {};

  const getRandomWord = (difficulty) => {
    const contentTypes = utils.ensureContentTypeSelected();
    const selectedType =
      contentTypes[Math.floor(Math.random() * contentTypes.length)];

    const cacheKey = `${selectedType}_${difficulty}`;

    if (!cache[cacheKey]) {
      // Initialize cache with appropriate array
      switch (selectedType) {
        case "words":
          cache[cacheKey] = contentDictionaries.words[difficulty];
          break;
        case "symbols":
          cache[cacheKey] = contentDictionaries.symbols;
          break;
        case "numbers":
          cache[cacheKey] = contentDictionaries.numbers;
          break;
        case "code":
          cache[cacheKey] = contentDictionaries.code[difficulty];
          break;
        default:
          cache[cacheKey] = contentDictionaries.words[difficulty];
      }
    }

    return utils.getRandomFromArray(cache[cacheKey]);
  };

  return { getRandomWord };
})();

const domHandlers = {
  createWordDisplay: () => {
    elements.wordDisplay.innerHTML = "";
    state.charSpans = [];

    state.wordsToType.forEach((word, wordIndex) => {
      // Add word characters
      [...word].forEach((char, charIndex) => {
        const charSpan = document.createElement("span");
        charSpan.className = "char-span";
        charSpan.textContent = char;
        charSpan.dataset.wordIndex = wordIndex;
        charSpan.dataset.charIndex = charIndex;
        elements.wordDisplay.appendChild(charSpan);
        state.charSpans.push(charSpan);
      });

      // Add space after word (except after last word)
      if (wordIndex < state.wordsToType.length - 1) {
        const spaceSpan = document.createElement("span");
        spaceSpan.className = "char-span space";
        spaceSpan.textContent = " ";
        spaceSpan.dataset.wordIndex = wordIndex;
        spaceSpan.dataset.charIndex = word.length;
        elements.wordDisplay.appendChild(spaceSpan);
        state.charSpans.push(spaceSpan);
      }
    });
  },

  updateCursorPosition: () => {
    if (
      state.charSpans.length === 0 ||
      state.currentWordIndex >= state.wordsToType.length
    )
      return;

    const currentPosition = elements.inputField.value.length;
    const currentWord = state.wordsToType[state.currentWordIndex];
    const currentWordLength = currentWord.length;

    let span;

    // When cursor is at start of word
    if (currentPosition === 0) {
      span = state.charSpans.find(
        (s) =>
          parseInt(s.dataset.wordIndex) === state.currentWordIndex &&
          parseInt(s.dataset.charIndex) === 0
      );
    } else if (currentPosition < currentWordLength) {
      // Cursor is before the next character
      span = state.charSpans.find(
        (s) =>
          parseInt(s.dataset.wordIndex) === state.currentWordIndex &&
          parseInt(s.dataset.charIndex) === currentPosition
      );
    } else {
      // At end of word — place after last visible character
      const currentWordSpans = state.charSpans.filter(
        (s) =>
          parseInt(s.dataset.wordIndex) === state.currentWordIndex &&
          s.textContent !== " "
      );
      span = currentWordSpans[currentWordSpans.length - 1];
    }

    if (span) {
      const rect = span.getBoundingClientRect();
      const wordDisplayRect = elements.wordDisplay.getBoundingClientRect();

      // Use rect.left unless it's end-of-word, then use rect.right
      const isAtEnd = currentPosition >= currentWordLength;
      const cursorX = isAtEnd ? rect.right : rect.left;

      elements.cursor.style.left = `${
        cursorX - wordDisplayRect.left + elements.wordDisplay.offsetLeft
      }px`;
      elements.cursor.style.top = `${
        rect.top - wordDisplayRect.top + elements.wordDisplay.offsetTop
      }px`;
      elements.cursor.style.height = `55px`;
      elements.cursor.style.opacity = "1";
    }
  },

  updateContentTypeClasses: () => {
    elements.contentCheckboxes.forEach((checkbox) => {
      const parentLabel = checkbox.closest(".mode-option");
      parentLabel.classList.toggle("text-blaze", checkbox.checked);
    });

    // Ensure at least one checkbox is checked
    const checkedCount = document.querySelectorAll(
      'input[name="content-type"]:checked'
    ).length;
    if (checkedCount === 0) {
      document.getElementById("words").checked = true;
      document
        .getElementById("words")
        .closest(".mode-option")
        .classList.add("text-blaze");
    }
  },

  updateDifficultyClasses: () => {
    elements.difficultyInputs.forEach((input) => {
      const parentLabel = input.closest(".mode-option");
      parentLabel.classList.toggle("text-blaze", input.checked);
    });
  },

  updateCharColors: () => {
    if (
      state.wordsToType.length === 0 ||
      state.currentWordIndex >= state.wordsToType.length
    ) {
      return;
    }

    const currentWord = state.wordsToType[state.currentWordIndex];
    const typed = elements.inputField.value;

    const currentWordSpans = state.charSpans.filter(
      (span) => parseInt(span.dataset.wordIndex) === state.currentWordIndex
    );

    for (let i = 0; i < currentWord.length; i++) {
      const charSpan = currentWordSpans[i];
      const originalChar = currentWord[i];
      const typedChar = typed[i];

      if (typedChar === undefined) {
        // Reset to original state (e.g. after backspace)
        charSpan.textContent = originalChar;
        charSpan.style.color = ""; // Reset color
      } else if (typedChar === originalChar) {
        charSpan.textContent = originalChar;
        charSpan.style.color = "white"; // Correct character
      } else {
        charSpan.textContent = typedChar; // Show incorrect char
        charSpan.style.color = "red"; // Wrong char
      }
    }

    domHandlers.updateCursorPosition();
  },
};

const game = {
  initialize: () => {
    domHandlers.updateDifficultyClasses();
    domHandlers.updateContentTypeClasses();
    game.setupEventListeners();
    game.startTest();
  },

  setupEventListeners: () => {
    // Input field events
    elements.inputField.addEventListener("keydown", (event) => {
      game.startTimer();
      game.handleWordUpdate(event);
      elements.cursor.classList.remove("blink");
    });

    elements.inputField.addEventListener("input", () => {
      domHandlers.updateCharColors();
    });

    // Focus events
    elements.inputField.addEventListener("focus", () => {
      elements.textField.classList.remove("blur-sm");
      elements.pointerFocus.classList.remove("flex");
      elements.pointerFocus.classList.add("hidden");
      elements.cursor.classList.remove("hidden");
    });

    elements.inputField.addEventListener("blur", () => {
      elements.textField.classList.add("blur-sm");
      elements.pointerFocus.classList.add("flex");
      elements.pointerFocus.classList.remove("hidden");
      elements.cursor.classList.add("hidden");
    });

    // Form change events
    elements.modeForm.addEventListener("change", (e) => {
      if (e.target.name === "mode" && e.target.type === "radio") {
        domHandlers.updateDifficultyClasses();
        game.startTest();
        elements.inputField.focus({ preventScroll: true });
      }
    });

    elements.contentCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        domHandlers.updateContentTypeClasses();
        game.startTest();
        elements.inputField.focus({ preventScroll: true });
      });
    });

    // Global TAB key restart
    window.addEventListener("keydown", (event) => {
      const isInput =
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA";
      const isTargetInput = document.activeElement === elements.inputField;

      if (isInput) {
        if (isTargetInput) {
          if (event.key === "Tab") {
            event.preventDefault();
            game.startTest();
            elements.inputField.focus();
          }
          // else: normal tap - no special handling needed
        }
        // else: normal tap - no special handling needed
      } else {
        if (event.key === "Tab") {
          event.preventDefault();
          game.startTest();
          elements.inputField.focus();
        } else {
          event.preventDefault();
          elements.inputField.focus();
        }
      }
    });
  },

  startTest: (wordCount = state.wordCount) => {
    state.wordsToType = [];
    state.charSpans = [];
    state.currentWordIndex = 0;
    state.startTime = null;
    state.previousEndTime = null;
    state.totalStats = { wpm: 0, accuracy: 0, count: 0 };
    elements.cursor.classList.add("blink");

    const difficulty = utils.getCurrentDifficulty();

    for (let i = 0; i < wordCount; i++) {
      state.wordsToType.push(wordSelection.getRandomWord(difficulty));
    }

    domHandlers.createWordDisplay();
    elements.inputField.value = "";
    elements.results.textContent = "";
    elements.totalResult.textContent = "";
    domHandlers.updateCursorPosition();
  },

  startTimer: () => {
    if (!state.startTime) state.startTime = Date.now();
    domHandlers.updateCursorPosition();
  },

  getCurrentStats: () => {
    const elapsedTime =
      (Date.now() - (state.previousEndTime || state.startTime)) / 1000;
    const wpm =
      state.wordsToType[state.currentWordIndex].length / 5 / (elapsedTime / 60);

    // Accuracy calculation
    let correct = 0;
    const expected = state.wordsToType[state.currentWordIndex];
    const typed = elements.inputField.value;

    for (let i = 0; i < Math.min(expected.length, typed.length); i++) {
      if (typed[i] === expected[i]) correct++;
    }

    const accuracy = (correct / Math.max(typed.length, expected.length)) * 100;

    return {
      wpm: parseFloat(wpm.toFixed(2)),
      accuracy: parseFloat(accuracy.toFixed(2)),
    };
  },

  handleWordUpdate: async (event) => {
    if (event.key === " ") {
      // Added this check as well
      if (
        state.wordsToType.length === 0 ||
        state.currentWordIndex >= state.wordsToType.length
      ) {
        event.preventDefault();
        return;
      }

      if (elements.inputField.value.trim() === "") {
        event.preventDefault();
        return;
      }

      if (!state.previousEndTime) state.previousEndTime = state.startTime;

      const { wpm, accuracy } = game.getCurrentStats();
      state.totalStats.wpm += wpm;
      state.totalStats.accuracy += accuracy;
      state.totalStats.count++;

      elements.results.textContent = `WPM: ${wpm}, Accuracy: ${accuracy}%`;

      state.currentWordIndex++;
      state.previousEndTime = Date.now();

      if (state.currentWordIndex >= state.wordsToType.length) {
        const avgWpm = (state.totalStats.wpm / state.totalStats.count).toFixed(
          2
        );
        const avgAccuracy = (
          state.totalStats.accuracy / state.totalStats.count
        ).toFixed(2);
        elements.results.textContent = "";

        elements.totalResult.setAttribute("style", "white-space: pre;");
        if (avgAccuracy >= 50) {
          elements.totalResult.textContent = `Congratulations ! \r\nTOTAL SCORE:\r\nWPM : ${avgWpm} | Accuracy : ${avgAccuracy}%`;
          await game.onGameComplete({ wpm: avgWpm, accuracy: avgAccuracy });
        } else {
          elements.totalResult.textContent = `Test failed, because of your accuracy: \r\nWPM: ${avgWpm} | Accuracy ${avgAccuracy}%`;
        }
      }

      elements.inputField.value = "";
      domHandlers.updateCursorPosition();
      event.preventDefault();
    }
  },

  onGameComplete: async (gameStats) => {
    const end = Date.now() + 1 * 1000;
    const colors = ["#ffa62f", "#2596d1"];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    if (!gameStats) {
      console.error("No game stats provided");
      return;
    }

    const difficulty = utils.getCurrentDifficulty();
    try {
      resultStats(gameStats.wpm, gameStats.accuracy, difficulty);

      await saveGameResult({
        wpm: gameStats.wpm,
        accuracy: gameStats.accuracy,
        difficulty: difficulty,
      });
    } catch (error) {
      console.error("Error saving game results:", error);
      // still show results even if save failed
      resultStats(gameStats.wpm, gameStats.accuracy, difficulty);
    }
  },
};

function resultStats(wpm, accuracy, difficulty) {
  const resultModal = document.getElementById("results-to-share");
  document.getElementById("results-wpm").textContent = wpm || "0";
  document.getElementById("results-accuracy").textContent = accuracy || "0%";
  document.getElementById("results-difficulty").textContent =
    difficulty || "Easy";

  resultModal.classList.remove("hidden");
  resultModal.classList.add("flex");

  // Button event listeners
  document.getElementById("try-again-btn").addEventListener("click", () => {
    resultModal.classList.remove("flex");
    resultModal.classList.add("hidden");
    game.initialize();
    elements.inputField.focus();
  });

  document
    .getElementById("share-results-btn")
    .addEventListener("click", async () => {
      try {
        const { getCurrentUser } = await import("./auth.js");
        const { createPost } = await import("./socials.js");

        const user = await getCurrentUser();
        if (!user) {
          // Show login prompt
          document.getElementById("login-prompt").classList.remove("hidden");

          // Hide after 5 seconds
          setTimeout(() => {
            document.getElementById("login-prompt").classList.add("hidden");
          }, 5000);

          return;
        }

        // Create post with results
        const content = `I just scored ${wpm} WPM with ${accuracy}% accuracy on ${difficulty} mode! 🚀`;
        await createPost("My Typing Results", content, null, [
          "typing",
          "results",
          "mikomiko",
        ]);

        // Show success message
        showNotification(
          "Your results have been shared successfully!",
          "success"
        );
        resultModal.classList.remove("flex");
        resultModal.classList.add("hidden");
        game.initialize();
        elements.inputField.focus();
      } catch (error) {
        console.error("Error sharing results:", error);
        showNotification(
          "Failed to share your results. Please try again.",
          "error"
        );
      }
    });

  document
    .getElementById("login-redirect-btn")
    .addEventListener("click", () => {
      document.getElementById("login-modal").classList.remove("hidden");
      resultModal.classList.remove("flex");
      resultModal.classList.add("hidden");
    });
}
export function showNotification(message, type = "success") {
  const notification = document.getElementById("notification-result");
  const messageEl = document.getElementById("notification-message-result");
  const notificationText = document.getElementById("notification-text");

  messageEl.textContent = message;

  // Show notification
  notification.classList.remove("hidden");
  notification.classList.add("flex");

  // Add type-specific color
  if (type === "success") {
    notificationText.classList.add("bg-azure");
  } else if (type === "error") {
    notificationText.classList.add("bg-red-500");
  } else {
    notificationText.classList.add("bg-blaze");
  }

  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.add("hidden");
    notification.classList.remove("flex");
  }, 6000);
}
// Database operations
async function saveGameResult(result) {
  if (!result) {
    console.error("No result provided to saveGameResult");
    return null;
  }

  const completeResult = {
    wpm: parseFloat(result.wpm) || 0,
    accuracy: parseFloat(result.accuracy) || 0,
    mode: result.difficulty || "easy",
  };

  const user = await getCurrentUser();
  if (!user) {
    console.error("User not found");
    return null;
  }

  try {
    // Save to game_results
    const { error: gameResultsError } = await supabase
      .from("game_results")
      .insert({
        user_id: user.id,
        wpm: completeResult.wpm,
        accuracy: completeResult.accuracy,
        mode: completeResult.mode,
      });

    if (gameResultsError) {
      throw new Error(`Game results error: ${gameResultsError.message}`);
    }

    // Update user averages
    await updateUserAverages(user.id);

    return completeResult;
  } catch (error) {
    console.error("Error in saveGameResult:", error);
    throw error;
  }
}

async function updateUserAverages(userId) {
  try {
    // Get all game results for the user
    const { data: results, error } = await supabase
      .from("game_results")
      .select("wpm, accuracy")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Fetch error: ${error.message}`);
    }

    if (!results || results.length === 0) {
      console.log("No results found to update averages");
      return;
    }

    // Calculate averages
    const maxAvg = results.reduce(
      (acc, result) => (acc < result.wpm ? result.wpm : acc),
      0
    );

    const maxAcc = results.reduce(
      (acc, result) => (acc < result.accuracy ? result.accuracy : acc),
      0
    );

    // Update user profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        wpm_avg: maxAvg,
        accuracy_avg: maxAcc,
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }
  } catch (error) {
    console.error("Error in updateUserAverages:", error);
    throw error;
  }
}

// Initialize the game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  game.initialize();
});

export { saveGameResult };
