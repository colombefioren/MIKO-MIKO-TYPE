// Draws the words of a test, colours typed letters and moves the caret.
// Only the window of three lines around the active word is visible.
import { h } from "../lib/dom.js";

const VISIBLE_LINES = 3;

export function createWordsView({ viewport, wordsEl, caret }) {
  let wordEls = [];
  let lineStep = 0;
  // Where the caret sits: word index and how many letters of it are typed.
  let caretAt = { index: 0, typedLength: 0 };

  function placeCaret() {
    const el = wordEls[caretAt.index];
    if (!el) return;
    const letters = el.children;
    // Letters are positioned relative to the words container (their offsetParent), not the word.
    let x;
    if (caretAt.typedLength < letters.length) x = letters[caretAt.typedLength].offsetLeft;
    else {
      const last = letters[letters.length - 1];
      x = last ? last.offsetLeft + last.offsetWidth : el.offsetLeft;
    }
    // Keep the active word on the second visible line.
    const shift = Math.max(0, el.offsetTop - lineStep);
    wordsEl.style.transform = shift ? `translateY(${-shift}px)` : "";
    caret.style.transform = `translate(${x}px, ${el.offsetTop}px)`;
  }

  // Line height and viewport size depend on the font, so they are measured, not hard-coded.
  function measure() {
    const first = wordEls[0];
    if (!first) return;
    const rowGap = parseFloat(getComputedStyle(wordsEl).rowGap) || 0;
    lineStep = first.offsetHeight + rowGap;
    viewport.style.setProperty("--words-height", `${lineStep * VISIBLE_LINES - rowGap}px`);
    caret.style.height = `${first.offsetHeight}px`;
    placeCaret();
  }

  new ResizeObserver(measure).observe(viewport);
  document.fonts?.ready.then(measure);

  return {
    render(targets) {
      wordEls = targets.map((word) => h("div.word", {}, [...word].map((char) => h("span.letter", {}, char))));
      wordsEl.replaceChildren(...wordEls, caret);
      wordsEl.style.transform = "";
      caretAt = { index: 0, typedLength: 0 };
      measure();
    },

    // Marks each letter correct or incorrect and shows extra letters typed past the word.
    updateWord(index, { target, typed, isDone, isActive }) {
      const el = wordEls[index];
      [...el.children].forEach((letter, i) => {
        if (i >= target.length) {
          letter.remove();
          return;
        }
        letter.classList.toggle("is-correct", i < typed.length && typed[i] === target[i]);
        letter.classList.toggle("is-incorrect", i < typed.length && typed[i] !== target[i]);
      });
      for (let i = target.length; i < typed.length; i++) el.append(h("span.letter.is-extra", {}, typed[i]));
      el.classList.toggle("has-error", isDone && typed !== target);
      el.classList.toggle("is-active", isActive);
    },

    moveCaret(index, typedLength) {
      caretAt = { index, typedLength };
      placeCaret();
    },
  };
}
