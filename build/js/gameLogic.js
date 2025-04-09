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

// Total stats container - now with count and initialized as numbers
let totalStat = { wpm: 0, accuracy: 0, count: 0 };

const modeSelect = document.getElementById("mode");
const wordDisplay = document.getElementById("word-display");
const inputField = document.getElementById("input-field");
const results = document.getElementById("results");
const totalResult = document.getElementById("total_result");

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

// Generate a random word from the selected mode
const getRandomWord = (mode) => {
  const wordList = words[mode];
  return wordList[Math.floor(Math.random() * wordList.length)];
};

// Initialize the typing test
const startTest = (wordCount = 5) => {
  wordsToType.length = 0; // Clear previous words
  wordDisplay.innerHTML = ""; // Clear display
  currentWordIndex = 0;
  startTime = null;
  previousEndTime = null;
  totalStat = { wpm: 0, accuracy: 0, count: 0 }; // Reset stats for new test

  for (let i = 0; i < wordCount; i++) {
    wordsToType.push(getRandomWord(modeSelect.value));
  }

  wordsToType.forEach((word, index) => {
    const span = document.createElement("span");
    span.textContent = word + " ";
    if (index === 0) span.style.color = "red"; // Highlight first word
    wordDisplay.appendChild(span);
  });

  inputField.value = "";
  results.textContent = "";
  totalResult.textContent = "";
};

// Start the timer when user begins typing
const startTimer = () => {
  if (!startTime) startTime = Date.now();
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
      // Disqualifying if avgAccuracy is <= 25
      if (avgAccuracy > 25) {
        totalResult.textContent = `Congratulations ! \r\nWPM : ${avgWpm} | Accuracy : ${avgAccuracy}%`;
      } else {
        totalResult.textContent = `Test failed, because of your accuracy: \r\nWPM: ${avgWpm} | Accuracy ${avgAccuracy}%`;
      }
    }

    inputField.value = ""; // Clear input field after space
    event.preventDefault(); // Prevent adding extra spaces
  }
};

// Highlight the current word in red
const highlightNextWord = () => {
  const wordElements = wordDisplay.children;

  if (currentWordIndex < wordElements.length) {
    if (currentWordIndex > 0) {
      wordElements[currentWordIndex - 1].style.color = "green";
    }
    wordElements[currentWordIndex].style.color = "red";
  }
};

// Event listeners
inputField.addEventListener("keydown", (event) => {
  startTimer();
  updateWord(event);
});

modeSelect.addEventListener("change", () => startTest());

// Start the test
startTest();

// Restart test when pressing TAB key
window.addEventListener("keydown", (event) => {
  if (event.key == "Tab") {
    event.preventDefault();
    startTest();
  }
});
