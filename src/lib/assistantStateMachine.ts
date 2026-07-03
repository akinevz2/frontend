import type { AssistantConfig } from "./naggingAssistantClient";

export type AssistantPromptOptions = {
  closeModalOnSubmit?: boolean;
  // wisdomRequest?: boolean;
};

export type ClippyShadowState = {
  isSubmitPulseActive: boolean;
  isConnectionFlashActive: boolean;
  showConversationModal: boolean;
  // isWisdomRequestPending: boolean;
  // wisdomPulsePhase: number;
  isAssistantRequestPending: boolean;
  isClippyHovered: boolean;
};

// Wisdom feature is disabled in production due to unresolved CORS constraints.
// const CLIPPY_WISDOM_PROMPTS = [
//     "Give me one oddly practical life tip.",
//     "Share one short piece of weird-but-useful wisdom.",
//     "Offer one concise line of advice for focus.",
// ];

export const hasConfiguredAssistant = (config: AssistantConfig) =>
  !!config.endpoint.trim() && !!config.model.trim();

export const shouldShowInTransitPulse = (options?: AssistantPromptOptions) =>
  !!options?.closeModalOnSubmit;

// export const pickRandomWisdomPrompt = () => {
//     const fallbackPrompt = "Share one concise piece of practical advice.";
//     return (
//         CLIPPY_WISDOM_PROMPTS[
//         Math.floor(Math.random() * CLIPPY_WISDOM_PROMPTS.length)
//         ] ?? fallbackPrompt
//     );
// };

export const buildClippyShadowFilter = (state: ClippyShadowState) => {
  if (state.isSubmitPulseActive) {
    return "drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 18px rgba(255, 255, 255, 0.8))";
  }

  if (state.isConnectionFlashActive) {
    return "drop-shadow(0 0 8px rgba(220, 30, 30, 0.95)) drop-shadow(0 0 16px rgba(220, 30, 30, 0.8))";
  }

  if (state.showConversationModal) {
    return "drop-shadow(0 0 8px rgba(0, 190, 70, 0.95)) drop-shadow(0 0 16px rgba(0, 190, 70, 0.8))";
  }

  // Wisdom pulse shadow intentionally disabled.
  // if (state.isWisdomRequestPending) {
  //     const intensity = 0.28 + ((Math.sin(state.wisdomPulsePhase) + 1) / 2) * 0.28;
  //     return `drop-shadow(0 0 7px rgba(255, 255, 255, ${intensity.toFixed(3)})) drop-shadow(0 0 14px rgba(255, 255, 255, ${(intensity * 0.8).toFixed(3)}))`;
  // }

  if (state.isAssistantRequestPending && state.isClippyHovered) {
    return "drop-shadow(0 0 8px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 14px rgba(190, 220, 255, 0.8))";
  }

  return "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4))";
};

// export class WisdomPulseClock {
//     private intervalId: number | null = null;
//
//     start(onTick: () => void, intervalMs: number) {
//         this.stop();
//         this.intervalId = window.setInterval(onTick, intervalMs);
//     }
//
//     stop() {
//         if (this.intervalId !== null) {
//             window.clearInterval(this.intervalId);
//             this.intervalId = null;
//         }
//     }
// }
