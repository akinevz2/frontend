import { useNavigate } from "react-router-dom";
import type { WindowNode } from "./model";
import { useWindowStore } from "./state";

/** OK follows the window's link if it has one, otherwise expands the window.
 * An `onOk` override (used by maximized windows) always wins: maximized
 * windows re-show OK even when their content is expanded, and pressing it
 * closes the fullscreen view. */
export function OkButton({
  node,
  onOk,
}: {
  node: WindowNode;
  /** Closing override handed only to maximized link-less windows. */
  onOk?: (() => void) | undefined;
}) {
  const { expand, remember } = useWindowStore();
  const navigate = useNavigate();

  const onClick = () => {
    if (onOk) {
      onOk();
      return;
    }
    const { link } = node;
    if (!link) {
      expand(node.id);
      history.replaceState(null, "", `#${node.id}`);
      return;
    }
    if (/^https?:/.test(link) || node.externalLink || /\.\w+$/.test(link)) {
      remember(node.id);
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
