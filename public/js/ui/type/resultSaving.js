// What happens to a finished test: saved to the account or the browser, shared, celebrated.
import { errorMessage, toast } from "../../lib/toast.js";
import { getAuthState, refreshProfile } from "../../services/auth.js";
import { getGuestResults, saveGuestResult, saveResult } from "../../services/results.js";
import { createPost } from "../../services/social.js";
import { invalidReason } from "../../game/stats.js";
import { celebrate } from "./celebrate.js";

function bestSoFar(user, profile) {
  if (user) return Number(profile?.best_wpm ?? 0);
  return Math.max(0, ...getGuestResults().map((result) => Number(result.wpm)));
}

export function createResultSaving(view) {
  // The last finished test, kept so a guest can save it after logging in.
  let last = null;

  async function saveForUser() {
    if (!last || last.savedId) return;
    view.setStatus("Saving your result");
    try {
      last.savedId = (await saveResult(last)).id;
      view.setStatus("Saved to your profile.");
      view.showButton("share", true);
      view.showButton("saveLogin", false);
      refreshProfile();
    } catch (error) {
      console.error("Could not save result", error);
      view.setStatus(`Not saved: ${errorMessage(error)}`);
    }
  }

  async function handleFinished(summary) {
    const invalid = invalidReason(summary);
    if (invalid) {
      view.setStatus(invalid);
      return;
    }
    last = {
      wpm: summary.wpm,
      rawWpm: summary.rawWpm,
      accuracy: summary.accuracy,
      difficulty: summary.options.difficulty,
      wordCount: summary.options.count,
      contentTypes: summary.options.contentTypes,
      durationMs: summary.durationMs,
      savedId: null,
    };

    const { user, profile } = getAuthState();
    const hadHistory = user ? Number(profile?.tests_count ?? 0) > 0 : getGuestResults().length > 0;
    const isPersonalBest = hadHistory && summary.wpm > bestSoFar(user, profile);
    view.setPersonalBest(isPersonalBest);
    celebrate({ big: isPersonalBest });

    if (user) await saveForUser();
    else {
      saveGuestResult(last);
      view.setStatus("Saved in this browser. Log in to keep your results and join the leaderboard.");
      view.showButton("saveLogin", true);
    }
  }

  async function share() {
    const { user } = getAuthState();
    if (!user || !last?.savedId) return;
    view.buttons.share.disabled = true;
    try {
      await createPost({ userId: user.id, content: "", resultId: last.savedId });
      toast("Shared with the community.", "success");
      view.showButton("share", false);
      view.setStatus("Shared. Find it in the Community feed.");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      view.buttons.share.disabled = false;
    }
  }

  return {
    handleFinished,
    share,
    // A guest who logs in on the results screen gets the finished test saved.
    saveAfterLogin: () => last && !last.savedId && saveForUser(),
    reset: () => (last = null),
  };
}
