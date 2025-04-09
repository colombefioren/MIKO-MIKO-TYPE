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

const modeSelect = document.getElementById("mode");
const wordDisplay = document.getElementById("word-display");
const inputField = document.getElementById("input-field");
const results = document.getElementById("results");
const totalResult = document.getElementById("total_result");
const cursor = document.getElementById("typing-cursor"); //Get the cursor in the js

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
  phrases: [
    "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"
  ],
};

// Generate a random word from the selected mode
const getRandomWord = (mode) => {
  const wordList = words[mode];
  return wordList[Math.floor(Math.random() * wordList.length)];
};

// Update cursor position
const updateCursorPosition = () => {
  if (charSpans.length === 0 || currentWordIndex >= wordsToType.length) return;

  const currentPosition = inputField.value.length;
  const currentWordLength = wordsToType[currentWordIndex].length;
  const spanIndex = charSpans.findIndex(span => 
    parseInt(span.dataset.wordIndex) === currentWordIndex && 
    parseInt(span.dataset.charIndex) === Math.min(currentPosition, currentWordLength)
  );

  if (spanIndex >= 0) {
    const span = charSpans[spanIndex];
    const rect = span.getBoundingClientRect();
    const wordDisplayRect = wordDisplay.getBoundingClientRect();
    
    cursor.style.left = `${rect.left - wordDisplayRect.left + wordDisplay.offsetLeft}px`;
    cursor.style.top = `${rect.top - wordDisplayRect.top + wordDisplay.offsetTop}px`;
    cursor.style.height = `${rect.height}px`;
    cursor.style.opacity = '1';
  }
};

// Initialize the typing test
const startTest = (wordCount = 25) => {
  wordsToType.length = 0; // Clear previous words
  wordDisplay.innerHTML = ""; // Clear display
  charSpans = []; // Reset character spans
  currentWordIndex = 0;
  startTime = null;
  previousEndTime = null;
  totalStat = { wpm: 0, accuracy: 0, count: 0 }; // Reset stats for new test

  for (let i = 0; i < wordCount; i++) {
    wordsToType.push(getRandomWord(modeSelect.value));
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
      // Disqualifying if avgAccuracy is <= 25
      if (avgAccuracy > 25) {
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
  charSpans.forEach(span => {
    span.style.color = "";
  });

  // Highlight current word in red
  const currentWordSpans = charSpans.filter(span => 
    parseInt(span.dataset.wordIndex) === currentWordIndex
  );
  currentWordSpans.forEach(span => {
    if (span.textContent !== " ") {
      span.style.color = "red";
    }
  });

  // Mark previous word as green
  if (currentWordIndex > 0) {
    const prevWordSpans = charSpans.filter(span => 
      parseInt(span.dataset.wordIndex) === currentWordIndex - 1
    );
    prevWordSpans.forEach(span => {
      if (span.textContent !== " ") {
        span.style.color = "green";
      }
    });
  }

  updateCursorPosition();
};

// Event listeners
inputField.addEventListener("keydown", (event) => {
  startTimer();
  updateWord(event);
});

inputField.addEventListener("input", () => {
  // Update character colors as user types
  const currentWord = wordsToType[currentWordIndex];
  const typed = inputField.value;
  
  const currentWordSpans = charSpans.filter(span => 
    parseInt(span.dataset.wordIndex) === currentWordIndex
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
