/**
 * Point culture (en Français car je suis un peu obligé):
 * Dans ce genre de jeu, un mot equivaut a 5 caractères, y compris les espaces.
 * La precision, c'est le pourcentage de caractères tapées correctement sur toutes les caractères tapées.
 *
 * Sur ce... Amusez-vous bien !
 */
let startTime = null,
  previousEndTime = null;
let currentWordIndex = 0;
const wordsToType = [];
let charSpans = []; // Store all character spans for cursor positioning

// Total stats container - now with count and initialized as numbers
let totalStat = { wpm: 0, accuracy: 0, count: 0 };
const modeForm = document.getElementById("mode-form");
const wordDisplay = document.getElementById("word-display");
const inputField = document.getElementById("input-field");
const results = document.getElementById("results");
const totalResult = document.getElementById("total_result");
const cursor = document.getElementById("typing-cursor"); //Get the cursor in the js

// Updated content dictionaries
const words = {
  easy: ["apple", "banana", "grape", "orange", "cherry"],
  medium: ["keyboard", "monitor", "printer", "charger", "battery"],
  hard: [
    "synchronize",
    "complicated",
    "development",
    "extravagant",
    "misconception",
  ],
};

const symbols = [
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
];
const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const code = {
  easy: ["var x = 5;", "if(true){}", "i += 1;", "x == y;", "a && b;"],
  medium: [
    "function(){}",
    "for(let i=0;)",
    "while(x<10)",
    "switch(val){}",
    "try{catch(){}}",
  ],
  hard: [
    "const getData = async () => {",
    "export default class App {",
    "document.querySelector('#id')",
    "return new Promise((res, rej) => {",
    "Object.keys(data).map(key => {",
  ],
};

// Generate a random word based on difficulty and selected content types
const getRandomWord = (difficulty) => {
  // Get all checked content type checkboxes
  const contentTypes = document.querySelectorAll(
    'input[name="content-type"]:checked'
  );

  // If no content types are selected, default to words
  if (contentTypes.length === 0) {
    document.getElementById("words").checked = true;
    return getRandomFromArray(words[difficulty]);
  }

  // Randomly select one of the checked content types
  const randomTypeIndex = Math.floor(Math.random() * contentTypes.length);
  const selectedType = contentTypes[randomTypeIndex].value;

  // Return a random item from the selected content type
  switch (selectedType) {
    case "words":
      return getRandomFromArray(words[difficulty]);
    case "symbols":
      return getRandomFromArray(symbols);
    case "numbers":
      return getRandomFromArray(numbers);
    case "code":
      return getRandomFromArray(code[difficulty]);
    default:
      return getRandomFromArray(words[difficulty]);
  }
};

// Helper function to get random item from array
const getRandomFromArray = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Update cursor position
const updateCursorPosition = () => {
  if (charSpans.length === 0 || currentWordIndex >= wordsToType.length) return;

  const currentPosition = inputField.value.length;
  const currentWordLength = wordsToType[currentWordIndex].length;
  const spanIndex = charSpans.findIndex(
    (span) =>
      parseInt(span.dataset.wordIndex) === currentWordIndex &&
      parseInt(span.dataset.charIndex) ===
        Math.min(currentPosition, currentWordLength)
  );

  if (spanIndex >= 0) {
    const span = charSpans[spanIndex];
    const rect = span.getBoundingClientRect();
    const wordDisplayRect = wordDisplay.getBoundingClientRect();

    cursor.style.left = `${
      rect.left - wordDisplayRect.left + wordDisplay.offsetLeft
    }px`;
    cursor.style.top = `${
      rect.top - wordDisplayRect.top + wordDisplay.offsetTop
    }px`;
    cursor.style.height = `${rect.height}px`;
    cursor.style.opacity = "1";
  }
};

// Initialize the typing test
const startTest = (wordCount = 50) => {
  wordsToType.length = 0; // Clear previous words
  wordDisplay.innerHTML = ""; // Clear display
  charSpans = []; // Reset character spans
  currentWordIndex = 0;
  startTime = null;
  previousEndTime = null;
  totalStat = { wpm: 0, accuracy: 0, count: 0 }; // Reset stats for new test

  // Get selected difficulty
  const difficultyRadios = document.querySelectorAll(
    'input[type="radio"][name="mode"]:checked'
  );
  const difficulty =
    difficultyRadios.length > 0 ? difficultyRadios[0].value : "easy";

  // Ensure at least one content type is selected
  const contentCheckboxes = document.querySelectorAll(
    'input[name="content-type"]:checked'
  );
  if (contentCheckboxes.length === 0) {
    document.getElementById("words").checked = true;
  }

  // Generate words to type
  for (let i = 0; i < wordCount; i++) {
    wordsToType.push(getRandomWord(difficulty));
  }

  // Create word display with individual character spans
  wordsToType.forEach((word, wordIndex) => {
    // Add word characters
    [...word].forEach((char, charIndex) => {
      const charSpan = document.createElement("span");
      charSpan.className = "char-span";
      charSpan.textContent = char;
      charSpan.dataset.wordIndex = wordIndex;
      charSpan.dataset.charIndex = charIndex;
      wordDisplay.appendChild(charSpan);
      charSpans.push(charSpan);
    });

    // Add space after word (except after last word)
    if (wordIndex < wordCount - 1) {
      const spaceSpan = document.createElement("span");
      spaceSpan.className = "char-span space";
      spaceSpan.textContent = " ";
      spaceSpan.dataset.wordIndex = wordIndex;
      spaceSpan.dataset.charIndex = word.length;
      wordDisplay.appendChild(spaceSpan);
      charSpans.push(spaceSpan);
    }
  });

  // Highlight first word
  highlightNextWord();
  inputField.value = "";
  results.textContent = "";
  totalResult.textContent = "";
  updateCursorPosition();
};

// Handle content type checkbox changes
function updateContentTypeClasses() {
  const contentCheckboxes = document.querySelectorAll(
    'input[name="content-type"]'
  );
  contentCheckboxes.forEach((checkbox) => {
    const parentLabel = checkbox.closest(".mode-option");
    if (checkbox.checked) {
      parentLabel.classList.add("text-blaze");
    } else {
      parentLabel.classList.remove("text-blaze");
    }
  });

  // Make sure at least one checkbox is checked
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
}

// Select difficulty radio inputs
const difficultyInputs = document.querySelectorAll(
  'input[type="radio"][name="mode"]'
);

// Function to update classes based on which difficulty is checked
function updateDifficultyClasses() {
  difficultyInputs.forEach((input) => {
    const parentLabel = input.closest(".mode-option");
    if (input.checked) {
      parentLabel.classList.add("text-blaze");
    } else {
      parentLabel.classList.remove("text-blaze");
    }
  });
}

// Add event listeners on each difficulty radio input
difficultyInputs.forEach((input) => {
  input.addEventListener("change", updateDifficultyClasses);
});

// Add event listeners on each content type checkbox
const contentCheckboxes = document.querySelectorAll(
  'input[name="content-type"]'
);
contentCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    updateContentTypeClasses();
    startTest();
    inputField.focus({ preventScroll: true });
  });
});

// Initialize the class states when the page loads
document.addEventListener("DOMContentLoaded", () => {
  updateDifficultyClasses();
  updateContentTypeClasses();
});

// Start the timer when user begins typing
const startTimer = () => {
  if (!startTime) startTime = Date.now();
  updateCursorPosition();
};

// Calculate and return WPM & accuracy
const getCurrentStats = () => {
  const elapsedTime = (Date.now() - (previousEndTime || startTime)) / 1000; // Seconds
  const wpm = wordsToType[currentWordIndex].length / 5 / (elapsedTime / 60); // 5 chars = 1 word

  // Accuracy calculation
  let correct = 0;
  const expected = wordsToType[currentWordIndex];
  const typed = inputField.value;

  for (let i = 0; i < Math.min(expected.length, typed.length); i++) {
    if (typed[i] === expected[i]) correct++;
  }

  const accuracy = (correct / Math.max(typed.length, expected.length)) * 100;

  return {
    wpm: parseFloat(wpm.toFixed(2)),
    accuracy: parseFloat(accuracy.toFixed(2)),
  };
};

// Move to the next word and update stats only on spacebar press
const updateWord = (event) => {
  // Check if spacebar is pressed
  if (event.key === " ") {
    if (inputField.value.trim() === "") {
      event.preventDefault(); // Disable spacebar if no characters are typed
      return;
    }

    if (!previousEndTime) previousEndTime = startTime;

    const { wpm, accuracy } = getCurrentStats();
    totalStat.wpm += wpm;
    totalStat.accuracy += accuracy;
    totalStat.count++;

    results.textContent = `WPM: ${wpm}, Accuracy: ${accuracy}%`;

    currentWordIndex++;
    previousEndTime = Date.now();
    highlightNextWord();
    // To insert new line in .textContent with \r\n
    totalResult.setAttribute("style", "white-space: pre;");

    if (currentWordIndex >= wordsToType.length) {
      const avgWpm = (totalStat.wpm / totalStat.count).toFixed(2);
      const avgAccuracy = (totalStat.accuracy / totalStat.count).toFixed(2);
      results.textContent = "";
      // Disqualifying if avgAccuracy is below 50
      if (avgAccuracy >= 50) {
        totalResult.textContent = `Congratulations ! \r\nTOTAL SCORE:\r\nWPM : ${avgWpm} | Accuracy : ${avgAccuracy}%`;
      } else {
        totalResult.textContent = `Test failed, because of your accuracy: \r\nWPM: ${avgWpm} | Accuracy ${avgAccuracy}%`;
      }
    }

    inputField.value = ""; // Clear input field after space
    updateCursorPosition(); // Update cursor position
    event.preventDefault(); // Prevent adding extra spaces
  }
};

// Highlight the current word in red
const highlightNextWord = () => {
  // Reset all words to default color
  // charSpans.forEach(span => {
  //   span.style.color = "";
  // });

  // Highlight current word in red
  const currentWordSpans = charSpans.filter(
    (span) => parseInt(span.dataset.wordIndex) === currentWordIndex
  );
  // currentWordSpans.forEach(span => {
  //   if (span.textContent !== " ") {
  //     span.style.color = "blue";
  //   }
  // });

  // Mark previous word as green
  if (currentWordIndex > 0) {
    const prevWordSpans = charSpans.filter(
      (span) => parseInt(span.dataset.wordIndex) === currentWordIndex - 1
    );
    // prevWordSpans.forEach(span => {
    //   if (span.textContent !== " ") {
    //     span.style.color = "white";
    //   }
    // });
  }

  updateCursorPosition();
};

// Event listeners

const startTyping = () => {
  inputField.addEventListener("keydown", (event) => {
    startTimer();
    updateWord(event);
  });
};

inputField.addEventListener("input", () => {
  // Update character colors as user types
  const currentWord = wordsToType[currentWordIndex];
  const typed = inputField.value;

  const currentWordSpans = charSpans.filter(
    (span) => parseInt(span.dataset.wordIndex) === currentWordIndex
  );

  for (let i = 0; i < typed.length && i < currentWord.length; i++) {
    const charSpan = currentWordSpans[i];
    if (typed[i] === currentWord[i]) {
      charSpan.style.color = "white"; // Correct character
    } else {
      charSpan.style.color = "red"; // Incorrect character
    }
  }

  updateCursorPosition();
});

// Update for difficulty radio buttons
modeForm.addEventListener("change", (e) => {
  if (e.target.name === "mode" && e.target.type === "radio") {
    startTest();
    inputField.focus({ preventScroll: true });
  }
});

// Start the test
startTest();
startTyping();

// Restart test when pressing TAB key
window.addEventListener("keydown", (event) => {
  if (event.key == "Tab") {
    event.preventDefault();
    startTyping();
    startTest();
  }
});

const textField = document.getElementById("text-field");
const pointerFocus = document.getElementById("pointer-focus");

//Disable blur on input when focused
inputField.addEventListener("focus", () => {
  textField.classList.remove("blur-sm");
  pointerFocus.classList.remove("flex");
  pointerFocus.classList.add("hidden");
  cursor.classList.remove("hidden");
});

//Enable blur on input when unfocused
inputField.addEventListener("blur", () => {
  textField.classList.add("blur-sm");
  pointerFocus.classList.add("flex");
  pointerFocus.classList.remove("hidden");
  cursor.classList.add("hidden");
});

import { supabase } from "./database.js";

export async function saveGameResult(result) {
  const user = await getCurrentUser();

  // Get selected content types for result metadata
  const selectedContentTypes = Array.from(
    document.querySelectorAll('input[name="content-type"]:checked')
  )
    .map((checkbox) => checkbox.value)
    .join(",");

  // Save to leaderboard
  const { error } = await supabase.from("leaderboard").insert({
    user_id: user.id,
    wpm: result.wpm,
    accuracy: result.accuracy,
    mode: selectedContentTypes, // Use content types instead of single mode
    difficulty: result.difficulty,
  });

  if (error) console.error("Error saving result:", error);

  // Update user's records if this is a new high score
  const { data: profile } = await supabase
    .from("profiles")
    .select("wpm_record, accuracy_record")
    .eq("id", user.id)
    .single();

  if (
    result.wpm > profile.wpm_record ||
    result.accuracy > profile.accuracy_record
  ) {
    await supabase
      .from("profiles")
      .update({
        wpm_record: Math.max(result.wpm, profile.wpm_record),
        accuracy_record: Math.max(result.accuracy, profile.accuracy_record),
      })
      .eq("id", user.id);
  }

  return result;
}

async function onGameComplete(result) {
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

  try {
    // Get difficulty and content types for the result
    const difficultyEl = document.querySelector(
      'input[type="radio"][name="mode"]:checked'
    );
    const difficulty = difficultyEl ? difficultyEl.value : "easy";

    const contentTypes = Array.from(
      document.querySelectorAll('input[name="content-type"]:checked')
    )
      .map((checkbox) => checkbox.value)
      .join(", ");

    // Add to result object
    result.difficulty = difficulty;
    result.contentTypes = contentTypes;

    // Save game result
    await saveGameResult(result);

    // Ask to share
    const share = confirm(`Your score: ${result.wpm} WPM! Share your result?`);

    if (share) {
      const content = prompt("Add a message to your post:");
      if (content) {
        await createPost(content, result);
        alert("Your score has been shared!");
        // Refresh posts
        await loadPosts();
      }
    }
  } catch (error) {
    console.error("Error saving/sharing result:", error);
    alert("Failed to save/share your result");
  }
}
