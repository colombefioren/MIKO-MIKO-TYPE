// Test settings form (difficulty, content, word count), remembered between visits.
const PREFS_KEY = "mikomiko:test-options";

export function createOptions(form) {
  function read() {
    const data = new FormData(form);
    return { difficulty: data.get("difficulty"), contentTypes: data.getAll("content"), count: Number(data.get("count")) };
  }

  function write({ difficulty, contentTypes, count }) {
    for (const input of form.elements) {
      if (input.name === "difficulty") input.checked = input.value === difficulty;
      if (input.name === "content") input.checked = contentTypes.includes(input.value);
      if (input.name === "count") input.checked = Number(input.value) === count;
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY));
      if (saved) write(saved);
    } catch {
      // Use the defaults from the markup.
    }
  }

  // Current options, with at least one content type always selected.
  function current() {
    const options = read();
    if (!options.contentTypes.length) {
      options.contentTypes = ["words"];
      write(options);
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(options));
    } catch {
      // Not critical.
    }
    return options;
  }

  // Unchecking the last content type re-checks it.
  form.addEventListener("change", (event) => {
    if (event.target.name === "content" && !read().contentTypes.length) event.target.checked = true;
  });

  return { restore, current };
}
