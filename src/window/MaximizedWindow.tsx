import { useRef, useState, type ReactNode, type RefObject } from "react";
import type { WindowFlags } from "./state";

/** Machinery for maximized-foreground windows: the dimmed sibling layer,
 * the reserved flow slot beneath the fixed overlay, the dismissal paths
 * (silent restore / title-bar-minimize slide) and the URL-hash hand-off.
 *
 * The component ALWAYS wraps the window element so React keeps its DOM
 * identity across maximize/dismiss — the window lives in the last child
 * slot in both states and is never remounted. */

export type MaximizedController = {
  /** Enters the maximized view: anchors the section hash, reserves the
   * flow slot (measured pre-lift) and lifts the window. Silent. */
  maximize: () => void;
  /** Silent, instant restore: ✕ on a maximized window, Escape, OK and
   * the out-of-bounds backdrop click all restore without sound (sounds
   * stay with the callers) and without the slide. */
  dismiss: () => void;
  /** Title-bar minimize only: restores with the slide-off ride. */
  dismissWithSlide: () => void;
  backdropRef: RefObject<HTMLDivElement | null>;
  parkedSize: { width: number; height: number } | null;
};

export function useMaximizedController(
  nodeId: string,
  patch: (id: string, flags: WindowFlags) => void,
  windowRef: RefObject<HTMLDivElement | null>,
): MaximizedController {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  /** The maximized window keeps its flow slot reserved underneath: the
   * surrounding windows never reflow when it lifts or returns. */
  const [parkedSize, setParkedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** Hands the URL hash to the topmost remaining maximized window after
   * a dismissal, or clears it entirely when none remain (a refresh then
   * lands on the plain page, not a stale maximized anchor). The
   * dismissed window's own backdrop is excluded via backdropRef, and
   * ride-out clones carry no id to ever qualify. */
  const settleHashAfterDismiss = () => {
    const remaining = [
      ...document.querySelectorAll<HTMLElement>(
        ".maximized-backdrop[data-window-id]",
      ),
    ].filter((candidate) => candidate !== backdropRef.current);
    const topId = remaining[remaining.length - 1]?.dataset.windowId;
    history.replaceState(
      history.state,
      "",
      topId ? `#${topId}` : `${location.pathname}${location.search}`,
    );
  };

  const dismiss = (slide: boolean) => {
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
    settleHashAfterDismiss();
    patch(nodeId, { maximized: false });
    if (riders.length) {
      window.setTimeout(() => riders.forEach((rider) => rider.remove()), 400);
    }
  };

  return {
    maximize: () => {
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
      history.replaceState(null, "", `#${nodeId}`);
      // A maximized window always shows its body — a stale minimized
      // flag would leave it title-bar-only in the foreground.
      patch(nodeId, { maximized: true, minimized: false });
    },
    dismiss: () => dismiss(false),
    dismissWithSlide: () => dismiss(true),
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
        onClick={
          maximized
            ? (event) => {
                // Clicks inside the window bubble up to the backdrop
                // (containment!) — only dimmed-area clicks dismiss.
                if (event.target === event.currentTarget) onOutsideClick();
              }
            : undefined
        }
      >
        {windowEl}
      </div>
    </>
  );
}
