import { toast } from "react-toastify";

/** Legacy `execCommand` copy: the only route in insecure contexts (e.g. the
 * site served over http:// to a LAN device), where `navigator.clipboard` is
 * absent. A hidden one-shot textarea keeps the page calm while selecting. */
function legacyCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Avoid a focus/scroll jump and the mobile on-screen keyboard pop.
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyText(
  text: string,
  success = "Content copied to clipboard!",
) {
  let error;
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success);
      return;
    } catch (caught) {
      error = caught;
    }
  }
  // Clipboard API missing (insecure context) or refused: try the legacy
  // route before surfacing a failure.
  if (legacyCopy(text)) {
    toast.success(success);
    return;
  }
  const reason = error instanceof Error ? error.message : String(error);
  toast.error(`Failed to copy content: ${reason}`);
}
