import { useReducer, useCallback, useRef } from "react";
import type {
    AssistantConfig,
} from "../lib/naggingAssistantClient";
import {
    requestAssistantCompletion,
} from "../lib/naggingAssistantClient";
import {
    hasConfiguredAssistant,
    type AssistantPromptOptions,
} from "../lib/assistantStateMachine";

/**
 * Reducer + hook for the assistant conversation/window state.
 *
 * Consolidates the cluster of `useState` values in App.tsx that all relate to
 * the clippy assistant conversation modal and the floating assistant response
 * window. Pure state transitions live in the reducer; the async
 * submit/fade-out sequence lives in the hook (it needs timers + the network
 * call, which are side effects, not reducer material).
 */

export interface AssistantState {
    /** Conversation prompt modal open? */
    showConversationModal: boolean;
    /** Current text in the conversation prompt input. */
    conversationInput: string;
    /** Error message shown in the conversation modal (empty = none). */
    conversationError: string;
    /** Markdown text shown in the floating assistant response window. */
    assistantWindowText: string;
    /** Floating response window visible? */
    assistantWindowVisible: boolean;
    /** Fading out (opacity transition) before hiding? */
    assistantWindowFading: boolean;
    /** Response window minimised (title bar only)? */
    assistantWindowMinimized: boolean;
    /** A completion request is in flight. */
    isAssistantRequestPending: boolean;
}

export const initialAssistantState: AssistantState = {
    showConversationModal: false,
    conversationInput: "",
    conversationError: "",
    assistantWindowText: "",
    assistantWindowVisible: false,
    assistantWindowFading: false,
    assistantWindowMinimized: false,
    isAssistantRequestPending: false,
};

export type AssistantAction =
    | { type: "OPEN_CONVERSATION" }
    | { type: "CLOSE_CONVERSATION" }
    | { type: "SET_CONVERSATION_INPUT"; value: string }
    | { type: "SET_CONVERSATION_ERROR"; value: string }
    | { type: "CLEAR_CONVERSATION_ERROR" }
    | { type: "START_FADING_WINDOW" }
    | { type: "HIDE_WINDOW" }
    | { type: "SHOW_WINDOW"; text: string }
    | { type: "DISMISS_WINDOW" }
    | { type: "TOGGLE_WINDOW_MINIMIZED" }
    | { type: "START_REQUEST" }
    | { type: "FINISH_REQUEST" };

export function assistantReducer(
    state: AssistantState,
    action: AssistantAction,
): AssistantState {
    switch (action.type) {
        case "OPEN_CONVERSATION":
            return {
                ...state,
                showConversationModal: true,
                conversationError: "",
            };
        case "CLOSE_CONVERSATION":
            return { ...state, showConversationModal: false };
        case "SET_CONVERSATION_INPUT":
            return { ...state, conversationInput: action.value };
        case "SET_CONVERSATION_ERROR":
            return { ...state, conversationError: action.value };
        case "CLEAR_CONVERSATION_ERROR":
            return { ...state, conversationError: "" };
        case "START_FADING_WINDOW":
            return { ...state, assistantWindowFading: true };
        case "HIDE_WINDOW":
            return {
                ...state,
                assistantWindowVisible: false,
                assistantWindowFading: false,
                assistantWindowText: "",
                assistantWindowMinimized: false,
            };
        case "SHOW_WINDOW":
            return {
                ...state,
                assistantWindowText: action.text,
                assistantWindowVisible: true,
                assistantWindowMinimized: false,
                assistantWindowFading: false,
            };
        case "DISMISS_WINDOW":
            return {
                ...state,
                assistantWindowVisible: false,
                assistantWindowFading: false,
                assistantWindowText: "",
                assistantWindowMinimized: false,
            };
        case "TOGGLE_WINDOW_MINIMIZED":
            return {
                ...state,
                assistantWindowMinimized: !state.assistantWindowMinimized,
            };
        case "START_REQUEST":
            return {
                ...state,
                isAssistantRequestPending: true,
                conversationError: "",
            };
        case "FINISH_REQUEST":
            return { ...state, isAssistantRequestPending: false };
        default: {
            const _exhaustive: never = action;
            void _exhaustive;
            return state;
        }
    }
}

/**
 * Hook wrapping `useReducer(assistantReducer, …)` plus the imperative side
 * effects the assistant needs: the submit/fade-out timers, the network call,
 * and the "not configured" guard. Exposes `state` plus typed action helpers
 * so call sites never touch `dispatch` directly.
 */
export function useAssistant(assistantConfig: AssistantConfig) {
    const [state, dispatch] = useReducer(
        assistantReducer,
        initialAssistantState,
    );

    const hasEndpointAndModel = useCallback(
        () => hasConfiguredAssistant(assistantConfig),
        [assistantConfig],
    );

    /**
     * Submit a prompt to the assistant. Handles the fade-out of any existing
     * response window, the network request, and showing the new response.
     * `onConnectionFlash` is called when the request fails so the caller can
     * trigger its connection-flash effect.
     */
    const submitAssistantPrompt = useCallback(
        async (
            prompt: string,
            options?: AssistantPromptOptions,
            onConnectionFlash?: () => void,
        ) => {
            const trimmedPrompt = prompt.trim();
            if (!trimmedPrompt) {
                return;
            }

            if (!hasEndpointAndModel()) {
                if (options?.closeModalOnSubmit) {
                    dispatch({
                        type: "SET_CONVERSATION_ERROR",
                        value: "Please configure endpoint and model first.",
                    });
                }
                return;
            }

            // Fade out an existing response window before replacing it.
            if (state.assistantWindowVisible || state.assistantWindowText) {
                dispatch({ type: "START_FADING_WINDOW" });
                await new Promise<void>((resolve) => {
                    window.setTimeout(() => resolve(), 220);
                });
                dispatch({ type: "HIDE_WINDOW" });
            }

            if (options?.closeModalOnSubmit) {
                dispatch({ type: "CLOSE_CONVERSATION" });
            }

            dispatch({ type: "START_REQUEST" });

            try {
                const result = await requestAssistantCompletion(
                    assistantConfig,
                    trimmedPrompt,
                    {
                        conversationPrompt: !!options?.closeModalOnSubmit,
                    },
                );
                dispatch({ type: "SHOW_WINDOW", text: result });
                const readyBeep = new Audio("/Beep.ogg");
                void readyBeep.play().catch(() => { });
            } catch (error) {
                dispatch({
                    type: "SET_CONVERSATION_ERROR",
                    value:
                        error instanceof Error
                            ? error.message
                            : "Failed to reach configured assistant endpoint.",
                });
                onConnectionFlash?.();
            } finally {
                dispatch({ type: "FINISH_REQUEST" });
            }
        },
        [hasEndpointAndModel, state.assistantWindowVisible, state.assistantWindowText],
    );

    /** Open the conversation modal (guards on configured endpoint/model). */
    const openConversationModal = useCallback(
        (onUnavailable?: () => void) => {
            if (!hasEndpointAndModel()) {
                onUnavailable?.();
                return;
            }
            dispatch({ type: "OPEN_CONVERSATION" });
        },
        [hasEndpointAndModel],
    );

    /** Submit the current conversation input, closing the modal on success. */
    const handleConversationSubmit = useCallback(
        (onConnectionFlash?: () => void) => {
            if (state.isAssistantRequestPending || !state.conversationInput.trim()) {
                return;
            }
            void submitAssistantPrompt(
                state.conversationInput,
                { closeModalOnSubmit: true },
                onConnectionFlash,
            );
        },
        [
            state.isAssistantRequestPending,
            state.conversationInput,
            submitAssistantPrompt,
        ],
    );

    return {
        state,
        dispatch,
        submitAssistantPrompt,
        openConversationModal,
        handleConversationSubmit,
        // Direct dispatchers for simple UI wiring:
        closeConversation: useCallback(() => dispatch({ type: "CLOSE_CONVERSATION" }), []),
        setConversationInput: useCallback(
            (value: string) => dispatch({ type: "SET_CONVERSATION_INPUT", value }),
            [],
        ),
        dismissWindow: useCallback(() => dispatch({ type: "DISMISS_WINDOW" }), []),
        toggleWindowMinimized: useCallback(
            () => dispatch({ type: "TOGGLE_WINDOW_MINIMIZED" }),
            [],
        ),
    };
}