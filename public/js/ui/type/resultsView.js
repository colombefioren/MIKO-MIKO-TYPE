// Results panel: numbers, speed chart, status line and the follow-up buttons.
import { $ } from "../../lib/dom.js";
import { duration, round } from "../../lib/format.js";
import { renderResultsChart } from "../../game/chart.js";

const describeMode = ({ difficulty, count, contentTypes }) => `${difficulty}, ${count} words, ${contentTypes.join(" + ")}`;

export function createResultsView(panel) {
  const field = (id) => $(`#${id}`, panel);
  const buttons = { share: field("share-btn"), saveLogin: field("save-login-btn") };
  const status = field("result-status");

  return {
    show(summary) {
      field("result-wpm").textContent = Math.round(summary.wpm);
      field("result-accuracy").textContent = `${round(summary.accuracy, 1)}%`;
      field("result-raw").textContent = Math.round(summary.rawWpm);
      field("result-time").textContent = duration(summary.durationMs);
      const { correct, incorrect, extra, missed } = summary.chars;
      field("result-chars").textContent = `${correct}/${incorrect}/${extra}/${missed}`;
      field("result-mode").textContent = describeMode(summary.options);
      field("result-pb").hidden = true;
      buttons.share.hidden = true;
      buttons.saveLogin.hidden = true;
      status.textContent = "";
      panel.hidden = false;
      // Focus the panel, not the Next button: a space typed right after the last word
      // would otherwise press the button and skip the results.
      panel.focus({ preventScroll: true });
      renderResultsChart(field("results-chart"), summary.samples);
    },
    hide() {
      panel.hidden = true;
    },
    get visible() {
      return !panel.hidden;
    },
    setStatus(text) {
      status.textContent = text;
    },
    setPersonalBest(value) {
      field("result-pb").hidden = !value;
    },
    showButton(name, visible) {
      buttons[name].hidden = !visible;
    },
    buttons,
  };
}
