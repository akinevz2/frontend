export interface AssistantPromptOptions {
  closeModalOnSubmit?: boolean;
}

export async function submitAssistantPrompt(
  prompt: string,
  assistantConfig: any,
  options?: AssistantPromptOptions,
): Promise<string> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Prompt cannot be empty");
  }

  if (
    !assistantConfig ||
    !assistantConfig.endpoint ||
    !assistantConfig.apiKey
  ) {
    throw new Error("Please configure endpoint and model first.");
  }

  return "Response from assistant...";
}

export function buildClippyShadowFilter(options: {
  isSubmitPulseActive: boolean;
  isConnectionFlashActive: boolean;
  showConversationModal: boolean;
  isAssistantRequestPending: boolean;
  isClippyHovered: boolean;
}): string {
  const filters: string[] = [];

  if (options.isSubmitPulseActive) {
    filters.push("brightness(1.3) saturate(1.3)");
  }

  if (options.isConnectionFlashActive) {
    filters.push("saturate(1.5) brightness(1.1)");
  }

  if (options.showConversationModal) {
    filters.push("grayscale(0.95)");
  }

  if (options.isAssistantRequestPending) {
    filters.push("opacity(0.7)");
  }

  if (options.isClippyHovered) {
    filters.push("brightness(1.2)");
  }

  return filters.length > 0 ? filters.join(" ") : "none";
}
