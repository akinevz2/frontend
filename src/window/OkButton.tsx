import { useNavigate } from "react-router-dom";
import type { WindowNode } from "./model";
import { useWindowStore } from "./state";

/** OK follows the window's link if it has one, otherwise expands the window. */
export function OkButton({ node }: { node: WindowNode }) {
  const { expand, remember } = useWindowStore();
  const navigate = useNavigate();

  const onClick = () => {
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
