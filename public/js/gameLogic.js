import { getCurrentUser } from "./auth.js";
import { supabase } from "./database.js";

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
  wordCount: 25,
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
      "new Set()",
      "new Map()",
      "new WeakMap()",
      "new WeakSet()",
      "Object.prototype",
      "Function.prototype",
      "Array.prototype",
      "String.prototype",
      "new Proxy()",
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

// DOM Handlers
const domHandlers = {
  createWordDisplay: () => {
    let html = "";

    state.wordsToType.forEach((word, wordIndex) => {
      // Add word characters
      [...word].forEach((char, charIndex) => {
        html += `<span class="char-span" data-word-index="${wordIndex}" data-char-index="${charIndex}">${char}</span>`;
      });

      // Add space after word (except after last word)
      if (wordIndex < state.wordsToType.length - 1) {
        html += `<span class="char-span space" data-word-index="${wordIndex}" data-char-index="${word.length}"> </span>`;
      }
    });

    elements.wordDisplay.innerHTML = html;
    state.charSpans = Array.from(
      elements.wordDisplay.querySelectorAll(".char-span")
    );
  },

  updateCursor: () => {
    if (
      state.charSpans.length === 0 ||
      state.currentWordIndex >= state.wordsToType.length
    )
      return;

    requestAnimationFrame(() => {
      const currentPosition = elements.inputField.value.length;
      const currentWordLength =
        state.wordsToType[state.currentWordIndex].length;

      // Find target span directly instead of using array methods
      let targetSpan = null;
      for (let i = 0; i < state.charSpans.length; i++) {
        const span = state.charSpans[i];
        if (
          parseInt(span.dataset.wordIndex) === state.currentWordIndex &&
          parseInt(span.dataset.charIndex) ===
            Math.min(currentPosition, currentWordLength)
        ) {
          targetSpan = span;
          break;
        }
      }

      if (targetSpan) {
        const rect = targetSpan.getBoundingClientRect();
        const wordDisplayRect = elements.wordDisplay.getBoundingClientRect();

        elements.cursor.style.left = `${
          rect.left - wordDisplayRect.left + elements.wordDisplay.offsetLeft
        }px`;
        elements.cursor.style.top = `${
          rect.top - wordDisplayRect.top + elements.wordDisplay.offsetTop
        }px`;
        elements.cursor.style.height = `${rect.height}px`;
        elements.cursor.style.opacity = "1";
      }
    });
  },

  // Debounced cursor update for performance
  debouncedUpdateCursor: null, // Will be initialized later

  updateStyleClasses: () => {
    // Update difficulty classes
    elements.difficultyInputs.forEach((input) => {
      const parentLabel = input.closest(".mode-option");
      parentLabel.classList.toggle("text-blaze", input.checked);
    });

    // Update content type classes
    elements.contentCheckboxes.forEach((checkbox) => {
      const parentLabel = checkbox.closest(".mode-option");
      parentLabel.classList.toggle("text-blaze", checkbox.checked);
    });
  },

  updateCharColors: () => {
    const currentWord = state.wordsToType[state.currentWordIndex];
    const typed = elements.inputField.value;

    // Get current word spans more efficiently
    const currentWordSpans = [];
    for (let i = 0; i < state.charSpans.length; i++) {
      const span = state.charSpans[i];
      if (
        parseInt(span.dataset.wordIndex) === state.currentWordIndex &&
        span.textContent !== " "
      ) {
        currentWordSpans.push(span);
      }
    }

    // Update colors efficiently
    for (let i = 0; i < currentWord.length; i++) {
      if (i >= currentWordSpans.length) break;

      const charSpan = currentWordSpans[i];

      if (i < typed.length) {
        charSpan.style.color = typed[i] === currentWord[i] ? "white" : "red";
      } else {
        charSpan.style.color = "";
      }
    }
  },
};

// Game mechanics
const game = {
  initializeGame: () => {
    // Initialize the debounced cursor update
    domHandlers.debouncedUpdateCursor = utils.debounce(
      domHandlers.updateCursor,
      16
    );

    // Set up event listeners
    game.setupEventListeners();

    // Initial game start
    game.startTest();
  },

  setupEventListeners: () => {
    // Only set up listeners if not already active
    if (state.activeListeners.size > 0) return;

    // Input field focus/blur events
    elements.inputField.addEventListener("focus", game.handleInputFocus);
    elements.inputField.addEventListener("blur", game.handleInputBlur);
    state.activeListeners.add("focus");
    state.activeListeners.add("blur");

    // Input field typing events
    elements.inputField.addEventListener("input", game.handleInput);
    elements.inputField.addEventListener("keydown", game.handleKeydown);
    state.activeListeners.add("input");
    state.activeListeners.add("keydown");

    // Form change events (using event delegation)
    elements.modeForm.addEventListener("change", game.handleFormChange);
    state.activeListeners.add("formChange");

    // Global TAB key restart
    window.addEventListener("keydown", game.handleGlobalKeydown);
    state.activeListeners.add("globalKeydown");
  },

  startTest: (wordCount = state.wordCount) => {
    // Reset game state
    state.wordsToType = [];
    state.currentWordIndex = 0;
    state.startTime = null;
    state.previousEndTime = null;
    state.totalStats = { wpm: 0, accuracy: 0, count: 0 };

    // Get difficulty
    const difficulty = utils.getCurrentDifficulty();

    // Ensure content type is selected
    utils.ensureContentTypeSelected();

    // Generate words efficiently
    for (let i = 0; i < wordCount; i++) {
      state.wordsToType.push(wordSelection.getRandomWord(difficulty));
    }

    // Create word display
    domHandlers.createWordDisplay();

    // Reset UI
    elements.inputField.value = "";
    elements.results.textContent = "";
    elements.totalResult.textContent = "";

    // Update cursor
    domHandlers.updateCursor();

    // Focus input field
    elements.inputField.focus({ preventScroll: true });
  },

  startTimer: () => {
    if (!state.startTime) state.startTime = Date.now();
    domHandlers.updateCursor();
  },

  calculateStats: () => {
    const elapsedTime =
      (Date.now() - (state.previousEndTime || state.startTime)) / 1000;
    if (elapsedTime === 0) return { wpm: 0, accuracy: 0 };

    const expected = state.wordsToType[state.currentWordIndex];
    const typed = elements.inputField.value;

    // Count correct characters efficiently
    let correct = 0;
    const minLength = Math.min(expected.length, typed.length);
    for (let i = 0; i < minLength; i++) {
      if (typed[i] === expected[i]) correct++;
    }

    const wpm = expected.length / 5 / (elapsedTime / 60);
    const accuracy = (correct / Math.max(typed.length, expected.length)) * 100;

    return {
      wpm: parseFloat(wpm.toFixed(2)),
      accuracy: parseFloat(accuracy.toFixed(2)),
    };
  },

  moveToNextWord: async () => {
    if (!state.previousEndTime) state.previousEndTime = state.startTime;

    const { wpm, accuracy } = game.calculateStats();
    state.totalStats.wpm += wpm;
    state.totalStats.accuracy += accuracy;
    state.totalStats.count++;

    elements.results.textContent = `WPM: ${wpm}, Accuracy: ${accuracy}%`;

    state.currentWordIndex++;
    state.previousEndTime = Date.now();

    // Check if test is complete
    if (state.currentWordIndex >= state.wordsToType.length) {
      await game.completeTest();
    } else {
      elements.inputField.value = "";
      domHandlers.updateCursor();
    }
  },

  completeTest: async () => {
    const avgWpm = (state.totalStats.wpm / state.totalStats.count).toFixed(2);
    const avgAccuracy = (
      state.totalStats.accuracy / state.totalStats.count
    ).toFixed(2);
    elements.results.textContent = "";

    // Configure totalResult for pre-formatted text
    elements.totalResult.setAttribute("style", "white-space: pre;");

    if (parseFloat(avgAccuracy) >= 50) {
      elements.totalResult.textContent = `Congratulations ! \r\nTOTAL SCORE:\r\nWPM : ${avgWpm} | Accuracy : ${avgAccuracy}%`;

      // Save results only if accuracy is >= 50%
      await game.saveResults({ wpm: avgWpm, accuracy: avgAccuracy });
    } else {
      elements.totalResult.textContent = `Test failed, because of your accuracy: \r\nWPM: ${avgWpm} | Accuracy ${avgAccuracy}%`;
    }
  },

  saveResults: async (gameStats) => {
    const user = await getCurrentUser();
    if (!user) {
      const login = confirm(
        "You need to be logged in to save your results. Would you like to log in now?"
      );
      if (login) {
        loginModal.classList.remove("hidden");
      }
      return;
    }

    const difficulty = utils.getCurrentDifficulty();
    const result = {
      wpm: gameStats.wpm || 0,
      accuracy: gameStats.accuracy || 0,
      mode: gameStats.mode || "normal",
      difficulty: difficulty,
    };

    try {
      // Save game result
      const savedResult = await saveGameResult(result);
      if (!savedResult) {
        throw new Error("Failed to save game result");
      }

      // Ask to share
      const share = confirm(
        `Your score: ${savedResult.wpm} WPM! Share your result?`
      );

      if (share) {
        const content = prompt("Add a message to your post:");
        if (content) {
          await createPost(content, savedResult);
          alert("Your score has been shared!");
          await loadPosts();
        }
      }
    } catch (error) {
      console.error("Error saving results:", error);
      alert("Failed to save/share your result");
    }
  },

  // Event handlers
  handleInputFocus: () => {
    elements.textField.classList.remove("blur-sm");
    elements.pointerFocus.classList.remove("flex");
    elements.pointerFocus.classList.add("hidden");
    elements.cursor.classList.remove("hidden");
  },

  handleInputBlur: () => {
    elements.textField.classList.add("blur-sm");
    elements.pointerFocus.classList.add("flex");
    elements.pointerFocus.classList.remove("hidden");
    elements.cursor.classList.add("hidden");
  },

  handleInput: () => {
    game.startTimer();
    domHandlers.updateCharColors();
    domHandlers.debouncedUpdateCursor();
  },

  handleKeydown: (event) => {
    game.startTimer();

    // Process spacebar for word completion
    if (event.key === " ") {
      if (elements.inputField.value.trim() === "") {
        event.preventDefault();
        return;
      }

      game.moveToNextWord();
      event.preventDefault();
    }
  },

  handleGlobalKeydown: (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      game.startTest();
    }
  },

  handleFormChange: (e) => {
    if (e.target.name === "mode" && e.target.type === "radio") {
      domHandlers.updateStyleClasses();
      game.startTest();
    } else if (e.target.name === "content-type") {
      domHandlers.updateStyleClasses();
      game.startTest();
    }
  },
};

// Database operations
async function saveGameResult(result) {
  // Validate the result object
  if (!result) {
    console.error("No result provided to saveGameResult");
    return null;
  }

  const completeResult = {
    wpm: result.wpm || 0,
    accuracy: result.accuracy || 0,
    mode: result.mode || "normal",
    difficulty: result.difficulty || "normal",
  };

  const user = await getCurrentUser();
  if (!user) {
    console.error("User not found");
    return null;
  }

  try {
    // Use a transaction for saving result and updating averages in one DB operation
    const { data, error } = await supabase.rpc(
      "save_game_result_and_update_averages",
      {
        user_id: user.id,
        wpm_value: completeResult.wpm,
        accuracy_value: completeResult.accuracy,
        mode_value: completeResult.mode,
      }
    );

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return completeResult;
  } catch (error) {
    console.error("Error in saveGameResult:", error);
    throw error;
  }
}

// Initialize game when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  domHandlers.updateStyleClasses();
  game.initializeGame();
});

// Export functions needed by other modules
export { saveGameResult };
