import { useEffect, useRef } from "react";
import { playLayeredAudio, playMinimizeClick } from "@/lib/audio";
import { getClippyState } from "@/lib/clippy";
import { Md } from "@/lib/markdown";
import { useSignals } from "@/lib/signals";
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

/** The refused close's kick (the sound policy is declared in ./themes). */
const CLOSE_SOUND = "/crunchy_kick.ogg";

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
  onOk,
  onMaximize,
}: {
  node: WindowNode;
  expanded: boolean;
  /** Fullscreen maximize layout: content first, OK/Permalink rail after. */
  maximized?: boolean | undefined;
  /** Closes the maximized view; OK keeps link navigation when linked. */
  onOk?: (() => void) | undefined;
  /** The window's raw maximize action — the OK button's middleware lifts
   * a linked window with it instead of navigating on the first press. */
  onMaximize?: (() => void) | undefined;
}) {
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
  // dismiss on link-less ones — while Cancel is the explicit dismiss
  // affordance that leaves the link untouched. margin-top: auto only
  // pushes the rail to the bottom edge when the window is taller than
  // its content, so nothing ever scrolls underneath it.
  if (maximized) {
    return (
      <div className="maximized-content-col">
        {content}
        <div className="ok-row ok-row-bottom">
          <OkButton
            node={node}
            onOk={node.link ? undefined : onOk}
            onMaximize={onMaximize}
          />
          {node.link && onOk && <CancelButton onClose={onOk} />}
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
        <OkButton node={node} onOk={onOk} onMaximize={onMaximize} />
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

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => {
      // Escape restores silently (no sound, no slide) like every other
      // non-minimize exit — no other key does.
      if (event.key === "Escape") maximizedCtl.dismiss();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [maximized, node.id, patch, maximizedCtl]);

  // Mobile: the maximized window's hash entry is a history PUSH, so the
  // OS back button removes it — the hash leaves this window first, which
  // dismisses the overlay (instead of ever leaving the page).
  useEffect(() => {
    if (!maximized) return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    const onHash = () => {
      if (location.hash !== `#${node.id}`) maximizedCtl.dismiss();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [maximized, node.id, maximizedCtl]);

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

  // Minimize and Close share the same window behaviour. Sounds are pinned
  // to their moments: the minimize click belongs to the title-bar
  // minimize and the ✕ cross on a MAXIMIZED window, the crunchy kick to
  // the ✕ close on an inline window, navigation gets its own click
  // (pageSlide). Escape and OK stay silent.
  const minimize = () => {
    if (maximized) {
      // The title-bar minimize is the ONLY dismissal that plays the
      // click + slide-off (Escape, OK, ✕ and the backdrop restore
      // silently).
      playMinimizeClick();
      maximizedCtl.dismissWithSlide();
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
  };

  const close = () => {
    if (maximized) {
      // ✕ on a maximized window = a minimize: restores into the page
      // flow with the minimize click — no crunchy kick, no slide.
      playMinimizeClick();
      maximizedCtl.dismiss();
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
    // Refusal keeps the window open; successful closings park/leave
    // in silence.
    const closes = !(funnyClose || vetoed);
    // The sound is declared in themes.ts (closeSound): the crunchy
    // kick is a non-closing window's sound only; the navigation's
    // Click.ogg belongs to the pageSlide transition.
    if (closeSound(closes, Boolean(leaves)) === "kick")
      playLayeredAudio(CLOSE_SOUND);
    if (!closes) return;
    // Easter egg: while Clippy is on screen, ✕ parks the window instead
    // of leaving the page — the mascot's unhide list offers it back
    // (restore). Never on leave-on-close pages (Projects), where ✕ means
    // navigate.
    if (!leaves && getClippyState().visible) {
      patch(node.id, { closed: true });
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
        onMinimize={minimize}
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
            // OK is the dismiss affordance in fullscreen: silent close,
            // no slide — the departing animation is the minimize's alone.
            // OK on a maximized window: dismiss AND reveal its content
            // (the returned window opens along with its direct children).
            // The raw maximize action rides along for the OK button's
            // middleware: a linked window's first OK press lifts the
            // maximized view, and the maximized OK navigates the link.
            onOk={maximized ? () => maximizedCtl.dismissRevealed() : undefined}
            onMaximize={maximizedCtl.maximize}
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
