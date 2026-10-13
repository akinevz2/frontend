import { toast } from "react-toastify";
import { copyText } from "@/lib/clipboard";

/** Copies the addon's text file (the window's link) to the clipboard. */
export function CopyAddon({
  src,
  text,
}: {
  src?: string | undefined;
  text?: string | undefined;
}) {
  const onClick = async () => {
    if (text) return copyText(text);
    if (!src) return;
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await copyText(await response.text());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to copy content: ${reason}`);
    }
  };
  return <button onClick={onClick}>Copy</button>;
}
