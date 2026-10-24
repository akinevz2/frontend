import { useNavigate } from "react-router-dom";
import type { WindowNode } from "./model";
import { useWindowStore } from "./state";

/** OK follows the window's link if it has one, otherwise expands the window.
 * An `onOk` override (used by maximized windows) always wins, and a
 * middleware sits between the override and the default: a linked window's
 * first OK press lifts the maximized view instead of navigating — only the
 * maximized OK passes through to the link. */
export function OkButton({
  node,
  onOk,
  onMaximize,
}: {
  node: WindowNode;
  /** Closing override handed only to maximized link-less windows. */
  onOk?: (() => void) | undefined;
  /** The window's raw maximize action, for the middleware below. */
  onMaximize?: (() => void) | undefined;
}) {
  const { flagsOf, expand, remember } = useWindowStore();
  const navigate = useNavigate();

  const onClick = () => {
    if (onOk) {
      onOk();
      return;
    }
    // OK middleware: intercept the first press on a linked window — it
    // opens the maximized view rather than leaving the page. Once the
    // window IS maximized (or no maximize action exists), the press
    // passes through to the default navigation below.
    if (node.link && onMaximize && !flagsOf(node.id).maximized) {
      onMaximize();
      return;
    }
    const { link } = node;
    // OK revealing a section no longer rewrites the hash — the hash follows
    // the maximized window (Window.tsx) and off-site departures only.
    if (!link) {
      expand(node.id);
      return;
    }
    if (/^https?:/.test(link) || node.externalLink || /\.\w+$/.test(link)) {
      // Leaving the site: bookmark this window into the hash first, so a
      // return visit (via back or the external page) lands back on the
      // section — revealed and scrolled to, never re-maximized.
      remember(node.id);
      history.replaceState(null, "", `#${node.id}`);
      window.location.assign(link);
    } else {
      navigate(link);
    }
  };

  return (
    <button data-window-id={node.id} onClick={onClick}>
      OK
    </button>
  );
}
