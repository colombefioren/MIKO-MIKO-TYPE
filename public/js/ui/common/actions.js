import { setBusy } from "../../lib/dom.js";
import { errorMessage, toast } from "../../lib/toast.js";

// Runs an async action from a button: busy state, success toast, error toast.
export async function runAction(button, { action, busyLabel = "", success, after }) {
  const restore = setBusy(button, busyLabel);
  try {
    await action();
    if (success) toast(success, "success");
    await after?.();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    if (button.isConnected) restore();
  }
}
