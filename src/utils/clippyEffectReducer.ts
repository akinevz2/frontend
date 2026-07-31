import { useReducer, useCallback, useEffect, useRef } from "react";

/**
 * Reducer + hook for the Clippy visual-effect state machine.
 *
 * Owns the three ephemeral UI flags that were loose `useState` values in
 * App.tsx, plus the imperative timers that drive them:
 *  - `isSubmitPulseActive`    — brief pulse after submitting to the assistant
 *  - `isClippyHovered`        — mouse is over the Clippy image
 *  - `isConnectionFlashActive`— flashes when the network goes offline or a
 *                              request fails
 *
 * The timers (submit-pulse timeout, connection-flash timeout) stay as refs —
 * they're imperative and don't belong in reducer state. The offline listener
 * is wired here so the effect state is self-contained.
 */

export const SHADOW_PULSE_MS = 700;

export interface ClippyEffectState {
    isSubmitPulseActive: boolean;
    isClippyHovered: boolean;
    isConnectionFlashActive: boolean;
}

export type ClippyEffectAction =
    | { type: "TRIGGER_SUBMIT_PULSE" }
    | { type: "CLEAR_SUBMIT_PULSE" }
    | { type: "SET_HOVERED"; value: boolean }
    | { type: "START_CONNECTION_FLASH" }
    | { type: "CLEAR_CONNECTION_FLASH" };

export const initialClippyEffectState: ClippyEffectState = {
    isSubmitPulseActive: false,
    isClippyHovered: false,
    isConnectionFlashActive: false,
};

export function clippyEffectReducer(
    state: ClippyEffectState,
    action: ClippyEffectAction,
): ClippyEffectState {
    switch (action.type) {
        case "TRIGGER_SUBMIT_PULSE":
            return { ...state, isSubmitPulseActive: true };
        case "CLEAR_SUBMIT_PULSE":
            return { ...state, isSubmitPulseActive: false };
        case "SET_HOVERED":
            return { ...state, isClippyHovered: action.value };
        case "START_CONNECTION_FLASH":
            return { ...state, isConnectionFlashActive: true };
        case "CLEAR_CONNECTION_FLASH":
            return { ...state, isConnectionFlashActive: false };
        default: {
            const _exhaustive: never = action;
            void _exhaustive;
            return state;
        }
    }
}

export function useClippyEffect() {
    const [state, dispatch] = useReducer(
        clippyEffectReducer,
        initialClippyEffectState,
    );

    const connectionFlashTimerRef = useRef<number | null>(null);

    // Clean up any pending flash timer on unmount.
    useEffect(() => {
        return () => {
            if (connectionFlashTimerRef.current !== null) {
                window.clearTimeout(connectionFlashTimerRef.current);
            }
        };
    }, []);

    const startConnectionFlash = useCallback(() => {
        dispatch({ type: "START_CONNECTION_FLASH" });

        if (connectionFlashTimerRef.current !== null) {
            window.clearTimeout(connectionFlashTimerRef.current);
        }

        connectionFlashTimerRef.current = window.setTimeout(() => {
            dispatch({ type: "CLEAR_CONNECTION_FLASH" });
            connectionFlashTimerRef.current = null;
        }, SHADOW_PULSE_MS);
    }, []);

    // Flash when the browser goes offline.
    useEffect(() => {
        const markDisconnected = () => {
            startConnectionFlash();
        };

        window.addEventListener("offline", markDisconnected);
        return () => {
            window.removeEventListener("offline", markDisconnected);
        };
    }, [startConnectionFlash]);

    const triggerSubmitPulse = useCallback(() => {
        dispatch({ type: "TRIGGER_SUBMIT_PULSE" });
        window.setTimeout(
            () => dispatch({ type: "CLEAR_SUBMIT_PULSE" }),
            SHADOW_PULSE_MS,
        );
    }, []);

    const setHovered = useCallback(
        (value: boolean) => dispatch({ type: "SET_HOVERED", value }),
        [],
    );

    return {
        state,
        triggerSubmitPulse,
        setHovered,
        startConnectionFlash,
    };
}