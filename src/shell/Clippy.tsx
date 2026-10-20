import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  attachClippy,
  getClippyState,
  onClippyClick,
  subscribeClippy,
  toggleClippyList,
} from "@/lib/clippy";
import { getHidden, subscribeHidden } from "@/window/hidden";

type Corner = "tl" | "tr" | "bl" | "br";

/** Where Clippy sits; mirrors the four screen corners. */
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/** A tap below this distance counts as a click, above it as a drag. */
const DRAG_THRESHOLD_PX = 6;
/** How long the arrival bob plays after Clippy repositions. */
const ARRIVE_MS = 600;

/** Hidden mascot; summoning logic lives in lib/clippy. Draggable & snappy. */
export function Clippy() {
  const { visible, bubble, saysNo, listOpen } = useSyncExternalStore(
    subscribeClippy,
    getClippyState,
  );
  const hidden = useSyncExternalStore(subscribeHidden, getHidden);
  useEffect(attachClippy, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    /** Pointer offset inside the mascot at grab time. */
    dx: number;
    dy: number;
    /** Grab point, for the click-vs-drag threshold. */
    cx: number;
    cy: number;
    moved: boolean;
  } | null>(null);
  /** Swallowed so a drag release doesn't also fire the click action. */
  const suppressClick = useRef(false);
  const [corner, setCorner] = useState<Corner>("br");
  /** True while the arrival bob (rise + fade) plays. */
  const [arriving, setArriving] = useState(false);

  const arriveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const arrive = () => {
    setArriving(true);
    clearTimeout(arriveTimer.current);
    arriveTimer.current = setTimeout(() => setArriving(false), ARRIVE_MS);
  };
  // Play the arrival bob on initial mount and whenever the mascot is
  // re-summoned; unmounting must not leave the timer dangling.
  useEffect(() => {
    if (visible) arrive();
    return () => clearTimeout(arriveTimer.current);
  }, [visible]);

  /** Frees the container for left/top dragging. No style is touched here:
   * a plain click (including one on the open window list) must not freeze
   * the mascot at stale absolute coordinates. */
  const grab = (event: React.PointerEvent<HTMLImageElement>) => {
    const el = containerRef.current;
    if (!el) return;
    // Capture on the image itself (it owns the move/up handlers); capture
    // on the container would retarget the stream away from them.
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = el.getBoundingClientRect();
    drag.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      cx: event.clientX,
      cy: event.clientY,
      moved: false,
    };
  };

  const follow = (event: React.PointerEvent<HTMLImageElement>) => {
    const dragState = drag.current;
    const el = containerRef.current;
    if (!dragState || !el) return;
    // If the pointerup somehow slipped through capture (retargeting hiccups
    // etc.), a buttonless move must not keep dragging the mascot along.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      release();
      return;
    }
    if (!dragState.moved) {
      if (
        Math.hypot(event.clientX - dragState.cx, event.clientY - dragState.cy) >
        DRAG_THRESHOLD_PX
      ) {
        // Crossing the threshold starts the actual drag: NOW the
        // corner-anchored styles become inline absolute coordinates, so
        // the free-drag box matches where the user grabbed.
        const rect = el.getBoundingClientRect();
        dragState.dx = event.clientX - rect.left;
        dragState.dy = event.clientY - rect.top;
        Object.assign(el.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          right: "auto",
          bottom: "auto",
        });
        dragState.moved = true;
      }
      return;
    }
    const clampedX = Math.min(
      Math.max(0, event.clientX - dragState.dx),
      window.innerWidth - el.offsetWidth,
    );
    const clampedY = Math.min(
      Math.max(0, event.clientY - dragState.dy),
      window.innerHeight - el.offsetHeight,
    );
    el.style.left = `${clampedX}px`;
    el.style.top = `${clampedY}px`;
  };

  const release = () => {
    const dragState = drag.current;
    const el = containerRef.current;
    if (!dragState || !el) return;
    drag.current = null;
    const rect = el.getBoundingClientRect();

    if (dragState.moved) {
      // Drag release: bob into the nearest of the four screen corners.
      suppressClick.current = true;
      snapToNearest(rect, el);
      arrive();
    }
  };

  /** Clears the free-drag inline box and commits the nearest corner. */
  const snapToNearest = (rect: DOMRect, el: HTMLElement) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const cornerPoints: Record<Corner, [number, number]> = {
      tl: [0, 0],
      tr: [window.innerWidth, 0],
      bl: [0, window.innerHeight],
      br: [window.innerWidth, window.innerHeight],
    };
    const nearest = CORNERS.reduce((best, candidate) => {
      const [bx, by] = cornerPoints[best];
      const [cx, cy] = cornerPoints[candidate];
      return Math.hypot(cx - centerX, cy - centerY) <
        Math.hypot(bx - centerX, by - centerY)
        ? candidate
        : best;
    }, "br" as Corner);
    ["left", "top", "right", "bottom"].forEach((k) =>
      el.style.removeProperty(k),
    );
    setCorner(nearest);
  };

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={["clippy", arriving && "clippy-arrive"]
        .filter(Boolean)
        .join(" ")}
      data-corner={corner}
    >
      {listOpen && hidden.items.length > 0 && (
        // The bubble is a wrapper carrying the speech-tail chrome; the list
        // scrolls INSIDE it, so the ::after tail stays outside the scroll
        // box (it would otherwise register as horizontal overflow and its
        // scrollbar would eat the row padding) and matches the "haha no"
        // hint bubble's design.
        <div className="clippy-bubble clippy-unhide-bubble">
          <ul className="clippy-unhide" aria-label="Hidden windows">
            {hidden.items.map((w) => (
              <li key={w.id}>
                <button onClick={() => hidden.restore(w.id)}>{w.label}</button>
              </li>
            ))}
            {hidden.items.length > 1 && (
              <li>
                {/* One click to spring everything back — the Clippy easter
                    egg's grand finale. */}
                <button
                  onClick={() =>
                    hidden.items.forEach((w) => hidden.restore(w.id))
                  }
                >
                  All
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      {!listOpen && bubble && (
        <div className="clippy-bubble" role="status">
          {saysNo ? (
            "haha it said no"
          ) : (
            <>
              It looks like you're trying to close something. Try clicking one
              of the <strong>✕ close buttons</strong> on the page!
            </>
          )}
        </div>
      )}
      <img
        className="clippy-image"
        src="/Clippy.png"
        alt="Clippy"
        draggable={false}
        onPointerDown={grab}
        onPointerMove={follow}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          // Toggle FIRST, then feed the burst counter: on a threshold click
          // the hint bubble wins as the LAST state update (its atomic set
          // closes the freshly opened list), instead of the toggle
          // dismissing it right after hint() armed it.
          if (hidden.items.length > 0) toggleClippyList();
          onClippyClick();
        }}
      />
    </div>
  );
}
