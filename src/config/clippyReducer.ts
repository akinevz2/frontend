import { useReducer, useEffect, useRef } from "react";
import {
  attachClippyListener,
  detachClippyListener,
  subscribeClippyBubble,
  subscribeClippyVisibility,
} from "../lib/keyboardInputUtils";

/**
 * Reducer + hook for the Clippy mascot visibility state machine.
 *
 * Owns the three mascot-display flags that were loose `useState` values in
 * App.tsx:
 *  - `showClippy`        — whether the Clippy image is on the page at all
 *  - `showClippyBubble`  — whether the speech bubble is showing
 *  - `clippyBubbleSaysNo`— whether the bubble is showing the "haha it said no"
 *                         variant (triggered by a crunchy-kick event while the
 *                         bubble is visible)
 *
 * The external subscriptions (`subscribeClippyVisibility`,
 * `subscribeClippyBubble`) and the `crunchy-kick-played` event listener are
 * wired here so the mascot state is self-contained.
 */

export interface ClippyState {
  /** Clippy image visible on the page? */
  showClippy: boolean;
  /** Speech bubble visible? */
  showClippyBubble: boolean;
  /** Bubble showing the "haha it said no" variant? */
  clippyBubbleSaysNo: boolean;
}

export type ClippyAction =
  | { type: "SET_SHOW_CLIPPY"; value: boolean }
  | { type: "SET_SHOW_CLIPPY_BUBBLE"; value: boolean }
  | { type: "SAY_NO" }
  | { type: "SAY_DEFAULT" };

export function clippyReducer(
  state: ClippyState,
  action: ClippyAction,
): ClippyState {
  switch (action.type) {
    case "SET_SHOW_CLIPPY":
      return { ...state, showClippy: action.value };
    case "SET_SHOW_CLIPPY_BUBBLE":
      return { ...state, showClippyBubble: action.value };
    case "SAY_NO":
      return { ...state, clippyBubbleSaysNo: true };
    case "SAY_DEFAULT":
      return { ...state, clippyBubbleSaysNo: false };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

/** Predicate: true on mobile phones (Clippy shows by default there). */
export type IsMobilePhoneDevice = () => boolean;

export function useClippy(isMobilePhoneDevice: IsMobilePhoneDevice) {
  const [state, dispatch] = useReducer(clippyReducer, undefined, () => ({
    showClippy: isMobilePhoneDevice(),
    showClippyBubble: false,
    clippyBubbleSaysNo: false,
  }));

  // Track the previous bubble-visibility so we can reset `clippyBubbleSaysNo`
  // when the bubble transitions from hidden→visible (mirrors the original
  // wasClippyBubbleVisibleRef logic in App.tsx).
  const wasBubbleVisibleRef = useRef(false);

  useEffect(() => {
    attachClippyListener();
    const unsubscribeVisibility = subscribeClippyVisibility((value) =>
      dispatch({ type: "SET_SHOW_CLIPPY", value }),
    );
    const unsubscribeBubble = subscribeClippyBubble((value) =>
      dispatch({ type: "SET_SHOW_CLIPPY_BUBBLE", value }),
    );

    return () => {
      unsubscribeVisibility();
      unsubscribeBubble();
      detachClippyListener();
    };
  }, []);

  // Reset the "said no" variant when the bubble reappears.
  useEffect(() => {
    const wasVisible = wasBubbleVisibleRef.current;
    if (!wasVisible && state.showClippyBubble) {
      dispatch({ type: "SAY_DEFAULT" });
    }
    wasBubbleVisibleRef.current = state.showClippyBubble;
  }, [state.showClippyBubble]);

  // A crunchy-kick event while the bubble is up flips it to "said no" and, on
  // the first one per bubble episode, cancels the event so the window that
  // triggered it doesn't close on that first click.
  useEffect(() => {
    const handleCrunchyKickPlayed = (event: Event) => {
      if (state.showClippyBubble && !state.clippyBubbleSaysNo) {
        event.preventDefault();
        dispatch({ type: "SAY_NO" });
      }
    };

    window.addEventListener("crunchy-kick-played", handleCrunchyKickPlayed);
    return () => {
      window.removeEventListener(
        "crunchy-kick-played",
        handleCrunchyKickPlayed,
      );
    };
  }, [state.showClippyBubble, state.clippyBubbleSaysNo]);

  return { state };
}
