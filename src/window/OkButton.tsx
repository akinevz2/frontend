import { useSignals } from "@/lib/signals";
import { hasContent, type WindowNode } from "./model";
import { useWindowStore } from "./state";

/** OK follows the window's link if it has one, otherwise expands the
 * window. The OK middleware is all signals with no callback threading:
 * on the maximized rail a link-less window MINIMIZES AND REVEALS
 * (window:minimize plays the click + slide-off, window:reveal expands
 * the section inline), an inline linked window lifts the maximized view
 * on its first press (window:maximize), and once maximized the press
 * passes through to the link below. */
export function OkButton({ node }: { node: WindowNode }) {
  const { flagsOf, expand, remember } = useWindowStore();
  const { dispatch } = useSignals();

  const onClick = () => {
    const maximized = flagsOf(node.id).maximized;
    if (maximized && !node.link) {
      // The maximized rail's OK on a link-less window: the minimize
      // choreography (click + slide-off) takes the view down, then the
      // section reveals inline — the OK button IS the back-out gesture.
      dispatch("window:minimize", { id: node.id });
      dispatch("window:reveal", { id: node.id, descendants: "direct" });
      return;
    }
    // OK middleware: intercept the first press on a linked window — it
    // opens the maximized view rather than leaving the page — EXCEPT a
    // link-section carrying no content of its own (hasContent): the
    // maximized view would only lift an empty shell around its rail,
    // so the press short-circuits straight to the link and the
    // maximized view stays away. Once the window IS maximized (a
    // permalink landing does that even content-free), the press falls
    // through to the navigation.
    if (node.link && !maximized && hasContent(node)) {
      dispatch("window:maximize", { id: node.id });
      return;
    }
    const { link } = node;
    // OK revealing a section never rewrites the URL-hash: the maximized
    // view's push owns the URL while a window is up, and the off-site
    // departure bookmarks its window into the entry's STATE instead.
    if (!link) {
      expand(node.id);
      return;
    }
    if (/^https?:/.test(link) || node.externalLink || /\.\w+$/.test(link)) {
      // Leaving the site: bookmark this window into the history entry's
      // state (history:remember) — the entry stays HASH-FREE, so
      // returning via back, the external page or a reload lands on the
      // section revealed and scrolled to (the store resolves the
      // bookmark), never re-maximized.
      remember(node.id);
      window.location.assign(link);
    } else {
      // Internal navigation is a signal: the shell's handler performs
      // the route change, so the window system stays router-free.
      dispatch("app:navigate", { to: link });
    }
  };

  return (
    <button data-window-id={node.id} onClick={onClick}>
      OK
    </button>
  );
}
