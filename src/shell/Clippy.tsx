import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  attachClippy,
  getClippyState,
  onClippyClick,
  subscribeClippy,
} from "@/lib/clippy";

/** Hidden mascot; summoning logic lives in lib/clippy. */
export function Clippy() {
  const { pathname } = useLocation();
  const { visible, bubble, saysNo } = useSyncExternalStore(
    subscribeClippy,
    getClippyState,
  );
  useEffect(attachClippy, []);

  if (!visible || pathname === "/blog") return null;

  return (
    <div className="clippy">
      {bubble && (
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
        onClick={onClippyClick}
      />
    </div>
  );
}
