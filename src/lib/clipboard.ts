import { toast } from "react-toastify";

export async function copyText(
  text: string,
  success = "Content copied to clipboard!",
) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    toast.error(`Failed to copy content: ${reason}`);
  }
}
