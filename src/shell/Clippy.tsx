import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  attachClippy,
  getClippyState,
  onClippyClick,
  subscribeClippy,
} from "@/lib/clippy";
import { getHidden, subscribeHidden } from "@/window/hidden";

/** Hidden mascot; summoning logic lives in lib/clippy. */
export function Clippy() {
  const { pathname } = useLocation();
  const { visible, bubble, saysNo } = useSyncExternalStore(
    subscribeClippy,
    getClippyState,
  );
  const hidden = useSyncExternalStore(subscribeHidden, getHidden);
  const [listOpen, setListOpen] = useState(false);
  useEffect(attachClippy, []);

  const hasHidden = hidden.items.length > 0;
  const showList = listOpen && hasHidden;

  if (!visible || pathname === "/blog") return null;

  return (
    <div className="clippy">
      {showList && (
        <ul className="clippy-bubble clippy-unhide" aria-label="Hidden windows">
          {hidden.items.map((w) => (
            <li key={w.id}>
              <button onClick={() => hidden.restore(w.id)}>{w.label}</button>
            </li>
          ))}
        </ul>
      )}
      {!showList && bubble && (
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
        onClick={() => (hasHidden ? setListOpen((o) => !o) : onClippyClick())}
      />
    </div>
  );
}
