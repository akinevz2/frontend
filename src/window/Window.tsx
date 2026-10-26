import { useEffect, useRef } from "react";
import { playMinimizeClick } from "@/lib/audio";
import { getClippyState } from "@/lib/clippy";
import { Md } from "@/lib/markdown";
import { useSignalHandler, useSignals } from "@/lib/signals";
import { CopyAddon } from "./CopyAddon";
import { BannerView, EmbedView } from "./Embed";
import { OkButton } from "./OkButton";
import { MaximizedWindow, useMaximizedController } from "./MaximizedWindow";
import { ResourceEmbed } from "./ResourceEmbed";
import { TitleBar } from "./TitleBar";
import type { WindowChild, WindowNode } from "./model";
import { permalinkFor, useWindowStore } from "./state";
import { closeSound, dataTheme, forcesExpanded } from "./themes";
import { hasTheme } from "./model";

function Children({ items }: { items: WindowChild[] }) {
  return (
    <ul>
      {items.map((child, index) => {
        switch (child.kind) {
          case "text":
            return (
              <li key={index}>
                <Md>{child.lines.join("  \n")}</Md>
              </li>
            );
          case "embed":
            return (
              <li key={index}>
                <EmbedView embed={child.embed} />
              </li>
            );
          case "banner":
            return (
              <li key={index}>
                <BannerView banner={child.banner} />
              </li>
            );
          case "element":
            return <li key={index}>{child.element}</li>;
          case "window":
            return <Window key={child.node.id} node={child.node} />;
        }
      })}
    </ul>
  );
}

/** The second maximized rail button: opens the window's permalink in a new
 * tab, landing on its own section. */
function PermalinkButton({ node }: { node: WindowNode }) {
  const { permalinkMode } = useWindowStore();
  const onClick = () => {
    window.open(
      permalinkFor(node, permalinkMode),
      "_blank",
      "noopener,noreferrer",
    );
  };
  return <button onClick={onClick}>Permalink</button>;
}

/** The maximized rail's dismiss button for linked windows: Cancel closes
 * the fullscreen view without touching OK's link (the dialog OK/Cancel
 * pair — OK confirms through the link, Cancel backs out). */
function CancelButton({ onClose }: { onClose: () => void }) {
  return <button onClick={onClose}>Cancel</button>;
}

function Body({
  node,
  expanded,
  maximized,
}: {
  node: WindowNode;
  expanded: boolean;
  /** Fullscreen maximize layout: content first, OK/Permalink rail after. */
  maximized?: boolean | undefined;
}) {
  const { dispatch } = useSignals();
  // Linked windows keep their OK button even when forced open: OK lifts
  // the maximized view (the maximized OK is what follows the link — e.g.
  // the "npm package" stub windows).
  const showOk = Boolean(node.link) || (!expanded && !forcesExpanded(node));
  const copyable = Boolean(node.status && node.link?.startsWith("/addons/"));
  const showContent = expanded || Boolean(node.link);

  const content = (
    <>
      {node.status && (
        <p className="addon-status">
          status: <em>{node.status}</em>
        </p>
      )}
      {showContent && node.children.length > 0 && (
        <Children items={node.children} />
      )}
      {expanded && node.embed && <ResourceEmbed src={node.embed} />}
    </>
  );

  // Maximized: the rail sits BELOW the content in normal flow — content on
  // top, then OK (+ Cancel for linked windows) + Permalink. Dialog rules:
  // OK keeps its native meaning — follow the link on linked windows,
  // minimize-and-reveal on link-less ones — while Cancel is the explicit
  // silent-dismiss affordance that leaves the link untouched. Both ride
  // the bus; the window's controller listens for its id.
  // margin-top: auto only pushes the rail to the bottom edge when the
  // window is taller than its content, so nothing scrolls beneath it.
  if (maximized) {
    return (
      <div className="maximized-content-col">
        {content}
        <div className="ok-row ok-row-bottom">
          <OkButton node={node} />
          {node.link && (
            <CancelButton
              onClose={() => dispatch("window:dismiss", { id: node.id })}
            />
          )}
          <PermalinkButton node={node} />
        </div>
      </div>
    );
  }

  if (copyable) {
    return (
      <div className="ok-row ok-row-bottom">
        {content}
        <CopyAddon src={node.link} text={node.copyText} />
      </div>
    );
  }

  if (showOk) {
    return (
      <div className="ok-row ok-row-bottom">
        {content}
        <OkButton node={node} />
      </div>
    );
  }

  return <>{content}</>;
}

export function Window({ node }: { node: WindowNode }) {
  const { flagsOf, patch, onLeave } = useWindowStore();
  const { dispatch } = useSignals();
  const leaves = node.depth === 0 && onLeave;
  const flags = flagsOf(node.id);
  const maximized = Boolean(flags.maximized);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const maximizedCtl = useMaximizedController(
    node.id,
    patch,
    flagsOf,
    windowRef,
  );

  // The window's own commands (window:maximize | window:dismiss |
  // window:minimize): every gesture routes THROUGH the bus — the OK
  // middleware, the title-bar buttons, Escape, the backdrop click, the
  // traversal out of the maximized view (page:returned) all DISPATCH,
  // and these listeners perform. Every window listens, only the named
  // window acts; the component closure supplies the controller, the
  // leaves-fold and the live maximized flag.
  useSignalHandler("window:maximize", ({ id }) => {
    if (id === node.id && !maximized) maximizedCtl.maximize();
  });
  useSignalHandler("window:dismiss", ({ id, reveal }) => {
    if (id !== node.id) return;
    // reveal: the dismiss-and-reveal pair (rail OK/Cancel) restores the
    // framing AND expands the content inline; no reveal is the silent
    // restore it always was (✕, Escape, backdrop, title-bar Restore).
    if (reveal) maximizedCtl.dismissRevealed();
    else maximizedCtl.dismiss();
  });
  useSignalHandler("window:minimize", ({ id, park }) => {
    if (id !== node.id) return;
    if (maximized) {
      // The maximized dismissal plays the minimize click + slide-off;
      // park carries the button semantics: set only by the actual
      // minimize gestures (title-bar button, double-click) — the
      // section underneath is minimized with the overlay (a
      // window-manager minimize). Traversals and the rail OK leave it
      // unset and the section is restored as it stood.
      playMinimizeClick();
      maximizedCtl.dismissWithSlide(park);
      return;
    }
    if (leaves) {
      // Navigation is the fold here: pageSlide animates every departing
      // window (and plays the minimize click). Don't fold twice.
      leaves();
      return;
    }
    // Inline windows collapse to their title bar — silently, with no
    // depart animation (the minimize click and the slide-off belong to
    // the title-bar minimize on a maximized window, and to navigation).
    patch(node.id, { expanded: false, maximized: false });
  });

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => {
      // Escape restores silently (no sound, no slide) like every other
      // non-minimize exit — no other key does.
      if (event.key === "Escape")
        dispatch("window:dismiss", { id: node.id, reveal: false });
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [maximized, node.id, dispatch, maximizedCtl]);

  if (flags.closed) return null;

  // Windows without a heading are plain groups of content, not windows.
  if (!node.heading && !node.embed) {
    return <Body node={node} expanded />;
  }

  /** Leaf windows — no nested sections and no embeds (embeds need the
   * maximized flex sizing for their iframe heights) — keep their natural
   * size when maximized: the dimmed backdrop highlights them instead of
   * the window ballooning to the viewport. */
  const leafWindow =
    !node.embed &&
    !node.children.some(
      (child) => child.kind === "window" || child.kind === "embed",
    );

  // Maximizing expands the interior exactly like pressing OK — a maximized
  // window always shows its full content in the backdrop.
  const expanded =
    forcesExpanded(node) || Boolean(flags.expanded || node.embed) || maximized;

  // Sounds stay pinned to the moments in the COMMAND handlers above:
  // the minimize click belongs to window:minimize (the title-bar
  // minimize AND the browser back out of the maximized view), the
  // crunchy kick to every ✕ press that stays on the page, and the
  // Click.ogg to the ✕ that navigates away — all ✕ sounds declared
  // through the bus (window:closed, rendered by closeSounds). Escape
  // and OK stay silent. The title-bar minimize itself owns NO
  // behaviour: it declares intent on the bus, the listener performs.
  const minimize = () => dispatch("window:minimize", { id: node.id });
  // The MINIMIZE BUTTON's intent: a window-manager minimize — on a
  // maximized window the park rides along, so the overlay AND the
  // section underneath both end up minimized. A double-click on the
  // title bar performs the same maximize/minimize toggle.
  const minimizeButton = () =>
    dispatch("window:minimize", { id: node.id, park: maximized });
  const titleBarDblClick = (event: React.MouseEvent) => {
    // Detached from the three buttons: a double-press on one of them is
    // two single gestures, never a toggle.
    if ((event.target as HTMLElement).closest("button")) return;
    if (maximized) {
      minimizeButton();
      return;
    }
    if (node.depth > 0) dispatch("window:maximize", { id: node.id });
  };

  const close = () => {
    if (maximized) {
      // ✕ on a maximized window restores it into the page flow — the
      // press STAYS on the page (no navigation), so its sound is the
      // crunchy kick, declared through the bus like every close. The
      // dismissal itself is silent restore (no slide, no reveal),
      // declared through the bus too; the title-bar minimize keeps the
      // click + slide. No direct controller call left here.
      dispatch("window:closed", { id: node.id, sound: closeSound(false) });
      dispatch("window:dismiss", { id: node.id, reveal: false });
      return;
    }
    const funnyClose = hasTheme(node, "funny");
    // The close attempt rides the signal bus: handlers (Clippy) may
    // refuse it by calling refuse() before dispatch returns.
    let vetoed = false;
    dispatch("window:close", {
      id: node.id,
      refuse: () => {
        vetoed = true;
      },
    });
    // The outcome rides the bus with its sound DECLARED (closeSounds
    // renders what is declared): the navigating close — ✕ on a
    // leave-on-close page — clicks; every staying press (refusal,
    // collapse, Clippy park) kicks. This component plays nothing.
    const closes = !(funnyClose || vetoed);
    dispatch("window:closed", {
      id: node.id,
      sound: closeSound(closes && Boolean(leaves)),
    });
    if (!closes) return;
    // Easter egg: while Clippy is on screen, ✕ parks the window instead
    // of leaving the page — the mascot's unhide list offers it back
    // (restore). Never on leave-on-close pages (Projects), where ✕ means
    // navigate.
    if (!leaves && getClippyState().visible) {
      patch(node.id, { closed: true });
      // This IS the successful close Clippy watched: it owns the outcome
      // and pipes up (clippy:hid — the offer bubble rides the bus).
      dispatch("clippy:hid", { id: node.id });
      return;
    }
    minimize();
    return;
  };

  const window_ = (
    <div
      ref={windowRef}
      id={maximized ? undefined : node.id}
      className={[
        "window",
        maximized && "maximized",
        maximized && leafWindow && "content-size",
        node.className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-theme={dataTheme(node)}
    >
      <TitleBar
        node={node}
        maximized={maximized}
        onMinimize={minimizeButton}
        onMaximize={() => {
          if (!maximized) {
            maximizedCtl.maximize();
            return;
          }
          // Restore button: instant dismiss (silent, no slide) + hash
          // hand-off.
          maximizedCtl.dismiss();
        }}
        onClose={close}
        onDoubleClick={titleBarDblClick}
      />
      {flags.minimized ? (
        // Minimized windows keep an OK row as their only interior
        // affordance: pressing it restores and reveals the window.
        <div className="window-body window-minimized-body">
          <div className="ok-row ok-row-bottom">
            <button
              onClick={() => {
                patch(node.id, { minimized: false, expanded: true });
                requestAnimationFrame(() =>
                  windowRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  }),
                );
              }}
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`window-body${maximized ? " maximized-window-body" : ""}`}
        >
          <Body
            node={node}
            expanded={expanded}
            maximized={maximized}
            // OK on the maximized rail rides the bus: a linked window
            // navigates its link (the middleware passes through), a
            // link-less one minimizes (the choreography rides
            // window:minimize) and reveals (window:reveal) — the
            // controllers listening under this node's id perform both,
            // so no callback threads through the tree.
          />
        </div>
      )}
    </div>
  );

  // The maximized chrome wraps the window in EVERY state: the window
  // element stays in the last, stable child slot so its DOM identity
  // survives maximize/dismiss round-trips, while the dimmed layer and
  // the reserved flow slot appear only while lifted.
  return (
    <MaximizedWindow
      maximized={maximized}
      controller={maximizedCtl}
      nodeId={node.id}
      onOutsideClick={maximizedCtl.dismiss}
      windowEl={window_}
    />
  );
}
