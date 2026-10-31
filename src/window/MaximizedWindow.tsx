import { useRef, useState, type ReactNode, type RefObject } from "react";
import type { WindowFlags } from "./state";
import { scrollToId } from "@/lib/scrollTo";
import { dispatchSignal } from "@/lib/signals";
import { permalinkFor, useWindowStore } from "./state";

/** Machinery for maximized-foreground windows: the dimmed sibling layer,
 * the reserved flow slot beneath the fixed overlay, the dismissal paths
 * (silent restore / title-bar-minimize slide) and the URL-hash hand-off.
 *
 * The component ALWAYS wraps the window element so React keeps its DOM
 * identity across maximize/dismiss — the window lives in the last child
 * slot in both states and is never remounted. */

export type MaximizedController = {
  /** Enters the maximized view: PUSHes the section's history entry (the
   * bookmark the back button pops out of), reserves the flow slot
   * (measured pre-lift) and lifts the window. Silent. */
  maximize: () => void;
  /** Silent, instant restore: ✕ on a maximized window, Escape and the
   * out-of-bounds backdrop click all restore without sound (sounds
   * stay with the callers) and without the slide. */
  dismiss: () => void;
  /** OK entry: restore AND reveal the window's content on return. */
  dismissRevealed: () => void;
  /** Title-bar minimize only: restores with the slide-off ride. */
  dismissWithSlide: (park?: boolean) => void;
  backdropRef: RefObject<HTMLDivElement | null>;
  parkedSize: { width: number; height: number } | null;
};

export function useMaximizedController(
  nodeId: string,
  patch: (id: string, flags: WindowFlags) => void,
  flagsOf: (id: string) => WindowFlags,
  windowRef: RefObject<HTMLDivElement | null>,
): MaximizedController {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const { windows, permalinkMode } = useWindowStore();
  /** The window's own flags at maximize time: dismissal restores them
   * instead of expanding anything ("only scroll to" — and a window that
   * was minimized before maximizing gets minimized back). */
  const preFlags = useRef<WindowFlags | null>(null);
  /** The maximized window keeps its flow slot reserved underneath: the
   * surrounding windows never reflow when it lifts or returns. */
  const [parkedSize, setParkedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** Hands the URL to the topmost remaining maximized window's permalink
   * after a dismissal (the page's own address form — ?post=slug on the
   * blog — so a refresh lands back there), or clears it entirely when
   * none remain — pathname WITHOUT the query, so a stale ?post can't
   * resurrect a maximized window after the last one was dismissed. The
   * dismissed window's own backdrop is excluded via backdropRef, and
   * ride-out clones carry no id to ever qualify. */
  const settleHashAfterDismiss = () => {
    const remaining = [
      ...document.querySelectorAll<HTMLElement>(
        ".maximized-backdrop[data-window-id]",
      ),
    ].filter((candidate) => candidate !== backdropRef.current);
    const topId = remaining[remaining.length - 1]?.dataset.windowId;
    const topNode = topId ? windows.find((w) => w.id === topId) : undefined;
    // The settle RIDES the history owner: the entry keeps the remaining
    // maximized window's bookmark (or none, when the last one went) and
    // lands on its permalink — pathname WITHOUT the query when none
    // remain, so a stale ?post can't resurrect a maximized window after
    // the last one was dismissed. The dismissed window's own backdrop is
    // excluded via backdropRef, and ride-out clones carry no id to ever
    // qualify.
    dispatchSignal("history:anchor", {
      id: topNode?.id,
      url: topNode
        ? permalinkFor(topNode, permalinkMode)
        : `${location.pathname}`,
      mode: "replace",
    });
  };

  /** The dismissal may hand the URL off ONLY when this window still
   * owns the active entry — the one its maximize push created, whose
   * state bookmark names it. An in-page dismissal (✕, Escape, backdrop,
   * title-bar restore, stacked settle) rides that entry and settles it.
   * A history-TRAVERSAL dismissal does not: the browser back already
   * popped onto the DESTINATION entry — whose hash and state bookmark,
   * when present, name the section to reveal and scroll to. Rewriting
   * that entry would strip the hash, drop the bookmark and land the
   * return un-revealed (the reveal is then unfixable: nothing in the
   * URL names the section any more). */
  const stillOwnsEntry = (): boolean =>
    (history.state as { window?: unknown } | null)?.window === nodeId;

  const dismiss = (slide: boolean, revealed = false, park = false) => {
    const riders: HTMLElement[] = [];
    const shell = backdropRef.current;
    if (shell) {
      // The whole foreground (dimmed layer + the window inside it) leaves
      // with a FADE, not a blink — even on non-slide dismissals. Clone
      // first, then hide the real one at once so the two never stack on
      // screen: two rgba(0,0,0,.6) layers read as complete darkness
      // before the commit removes the real one. The clone mounts INSIDE
      // the page tree (the raised page paints above body-level content
      // while a backdrop exists) — see the z-index ladder in extras.css.
      const riding = shell.cloneNode(true) as HTMLElement;
      riding.classList.add("page-slide-backdrop-ride");
      // Drop the backdrop class: body:has(.maximized-backdrop) raises the
      // whole page over the menu bar, and it must unlock the instant the
      // real backdrop unmounts — the ride's darkening carries its own
      // fixed/full-size look via .page-slide-backdrop-ride instead.
      riding.classList.remove("maximized-backdrop");
      riding.removeAttribute("data-window-id");
      riding.setAttribute("inert", "");
      if (!slide) {
        // Non-slide dismissals restore the real window at once; the ride
        // rides only the darkening, so strip the frozen window copy.
        riding.querySelector(".window")?.remove();
      } else {
        const popped = windowRef.current;
        if (popped) {
          const rect = popped.getBoundingClientRect();
          riding
            .querySelector<HTMLElement>(".window")
            ?.style.setProperty(
              "--page-fold-dy",
              `${Math.max(0, Math.round(window.innerHeight - rect.bottom))}px`,
            );
          riding
            .querySelector<HTMLElement>(".window")
            ?.classList.add("window-minimize");
        }
      }
      const page = shell.closest(".page") ?? document.body;
      page.appendChild(riding);
      riders.push(riding);
      shell.style.opacity = "0";
    }
    if (stillOwnsEntry()) settleHashAfterDismiss();
    // Every exit restores the window's OWN flags as they stood at
    // maximize time — the minimize choreography (the click and the
    // slide-off rider) is the departure ANIMATION. EXCEPT the parked
    // minimize (the title-bar minimize button, and the double-click on
    // the maximized title bar): the section underneath is minimized
    // EXACTLY like the inline minimize handler does — collapsed
    // (expanded:false), OK row bottom-right, the section's normal
    // resting shape on the page. No third-state remnant: the maximized
    // and inline minimize buttons land the window in the SAME state.
    patch(nodeId, {
      maximized: false,
      minimized: false,
      ...(park ? { expanded: false } : (preFlags.current ?? {})),
    });
    if (revealed) {
      // The reveal (lineage + direct content) rides the signal bus —
      // the store's handler expands; the controller only restores.
      dispatchSignal("window:reveal", { id: nodeId, descendants: "direct" });
    }
    if (riders.length) {
      window.setTimeout(() => riders.forEach((rider) => rider.remove()), 400);
    }
    // NO landing scroll on dismissal: a close is not an arrival. Every
    // exit restores the page at the exact place it was standing before
    // the lift (the reserved flow slot keeps the layout still). Only
    // arrivals land: history returns and permalink loads (pageSlide's
    // scrollToHash and the store's confirm).
    // EXCEPT the dismissal of a SEEDED landing: the maximized state
    // came from the URL (a permalink opened the section maximized, or
    // a refresh held it) — the reader never stood anywhere on this
    // page, and the page rides at its arrival top with the section
    // somewhere below the fold. The press that un-maximizes IS the
    // reader's arrival at the section's inline resting place, so it
    // lands the page on the section — the shared aiming scroll (the
    // pageSlide theme's landing rules: smooth, on-screen-aware,
    // re-aimed while the layout grows around the freshly revealed
    // content). A snapshot exists ⇒ the lift happened in-page and the
    // no-scroll rule stands.
    if (preFlags.current === null) scrollToId(nodeId);
  };
  return {
    maximize: () => {
      // Snapshot the window's own flags first: the dismissal restores
      // exactly these (never maximizes content, re-minimizes if it was
      // minimized before the lift). The maximized key itself is
      // stripped — a fresh-permalink landing seeds the window maximized
      // with NO snapshot, and a later real maximize on such a window
      // would otherwise spread the lifted flag straight back into the
      // restore (dismissal un-maximizes, always).
      const pre: WindowFlags = { ...flagsOf(nodeId) };
      delete pre.maximized;
      preFlags.current = pre;
      // The hash anchors the maximized window so a refresh lands back on
      // the revealed section. replaceState is untouched by the pageSlide
      // pushState patch — no transition, no sound.
      const el = windowRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setParkedSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
      // Anchor the URL so a refresh lands back on the revealed section —
      // in the page's own permalink form (?post=slug on the blog, hash
      // elsewhere). The anchor is a history PUSH, on every screen: the
      // maximized view is one entry deep, so the browser back button
      // (desktop and OS-mobile alike) pops INTO the pre-maximize entry —
      // the page:returned repair sees the maximized window no longer
      // named by the URL and performs the minimize choreography
      // (window:minimize). Same-path pushes stay silent in the pageSlide
      // wrapper — no transition, no sound.
      const node = windows.find((w) => w.id === nodeId);
      dispatchSignal("history:anchor", {
        id: nodeId,
        url: node ? permalinkFor(node, permalinkMode) : `#${nodeId}`,
        mode: "push",
      });
      // A maximized window shows its body — a stale minimized flag would
      // leave it title-bar-only in the foreground. DESCENDANTS keep the
      // flags they hold: the maximized view is a framing, not a reveal —
      // collapsed sections stay collapsed so the OK/Cancel/Permalink
      // rail stays on screen instead of the content scrolling it away.
      patch(nodeId, { maximized: true, minimized: false });
    },
    dismiss: () => dismiss(false),
    dismissRevealed: () => dismiss(false, true),
    dismissWithSlide: (park?: boolean) => dismiss(true, false, park),
    backdropRef,
    parkedSize,
  };
}

export function MaximizedWindow({
  maximized,
  controller,
  nodeId,
  onOutsideClick,
  windowEl,
}: {
  /** Whether the window is currently lifted over the backdrop. */
  maximized: boolean;
  controller: MaximizedController;
  nodeId: string;
  onOutsideClick: () => void;
  /** The live window element — always rendered INSIDE the shell (the
   * background element while maximized), in the same child slot, so its
   * DOM identity survives maximize/dismiss round-trips. */
  windowEl: ReactNode;
}) {
  return (
    <>
      {maximized && controller.parkedSize && (
        // The flow slot the lifted window left behind: measured at lift
        // time, keeps the surrounding windows from reflowing (no jitter
        // on maximize/unmaximize).
        <div
          className="window-parked"
          style={{
            width: controller.parkedSize.width,
            height: controller.parkedSize.height,
          }}
          aria-hidden
        />
      )}
      <div
        ref={controller.backdropRef}
        className={maximized ? "maximized-backdrop" : "maximized-shell"}
        data-window-id={nodeId}
        role={maximized ? "button" : undefined}
        tabIndex={maximized ? 0 : undefined}
        aria-label={maximized ? "Exit maximized view" : undefined}
        onClick={
          maximized
            ? (event) => {
                // Clicks inside the window bubble up to the backdrop
                // (containment!) — only dimmed-area clicks dismiss.
                if (event.target === event.currentTarget) onOutsideClick();
              }
            : undefined
        }
        onKeyDown={
          maximized
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOutsideClick();
                }
              }
            : undefined
        }
      >
        {windowEl}
      </div>
    </>
  );
}
