import { useEffect, useRef } from "react";
import { playLayeredAudio } from "@/lib/audio";
import { getClippyState } from "@/lib/clippy";
import { Md } from "@/lib/markdown";
import { CopyAddon } from "./CopyAddon";
import { BannerView, EmbedView } from "./Embed";
import { OkButton } from "./OkButton";
import { ResourceEmbed } from "./ResourceEmbed";
import { TitleBar } from "./TitleBar";
import type { WindowChild, WindowNode } from "./model";
import { permalinkFor, useWindowStore } from "./state";
import { dataTheme, forcesExpanded } from "./themes";
import { hasTheme } from "./model";

const CLOSE_SOUND = "/crunchy_kick.ogg";
const MINIMIZE_SOUND = "/Click.ogg";

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
}: {
  node: WindowNode;
  expanded: boolean;
  /** Fullscreen maximize layout: content first, OK/Permalink rail after. */
  maximized?: boolean | undefined;
  /** Closes the maximized view; OK keeps link navigation when linked. */
  onOk?: (() => void) | undefined;
}) {
  // Linked windows keep their OK button even when forced open: OK is the
  // affordance that follows the link (e.g. the "npm package" stub windows).
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
          <OkButton node={node} onOk={node.link ? undefined : onOk} />
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
        <OkButton node={node} />
      </div>
    );
  }

  return <>{content}</>;
}

export function Window({ node }: { node: WindowNode }) {
  const { flagsOf, patch, onLeave } = useWindowStore();
  const leaves = node.depth === 0 && onLeave;
  const flags = flagsOf(node.id);
  const maximized = Boolean(flags.maximized);
  const windowRef = useRef<HTMLDivElement | null>(null);

  /** Hand the URL hash to the topmost remaining maximized window after a
   * dismissal, or clear it entirely when none remain (so a refresh lands
   * on the plain page instead of a stale maximized anchor). DOM order is
   * the topmost truth; ride-out clones are excluded or the dismissed
   * window would re-anchor the hash to itself. */
  const settleHashAfterDismiss = () => {
    const mine = windowRef.current?.closest(".maximized-backdrop");
    const remaining = [
      ...document.querySelectorAll<HTMLElement>(
        ".maximized-backdrop[data-window-id]",
      ),
    ].filter(
      (candidate) =>
        candidate !== mine &&
        !candidate.classList.contains("page-slide-backdrop-ride"),
    );
    const topId = remaining[remaining.length - 1]?.dataset.windowId;
    history.replaceState(
      history.state,
      "",
      topId ? `#${topId}` : `${location.pathname}${location.search}`,
    );
  };

  /** Maximized dismissal: the window is already IN the page tree, so the
   * patch restores it to its flow slot on this very commit (no re-adopt,
   * no content flash) while static clones — the dimmed layer fading, the
   * window sliding below the bottom edge — ride the exit out on top. */
  const dismissMaximized = () => {
    const backdrop = windowRef.current?.closest(".maximized-backdrop");
    const popped = windowRef.current;
    if (backdrop && popped) {
      const ridingBackdrop = backdrop.cloneNode(true) as HTMLElement;
      ridingBackdrop.classList.add("page-slide-backdrop-ride");
      ridingBackdrop.removeAttribute("data-window-id");
      ridingBackdrop.setAttribute("inert", "");
      document.body.appendChild(ridingBackdrop);
      const ridingWindow = popped.cloneNode(true) as HTMLElement;
      ridingWindow.setAttribute("inert", "");
      ridingWindow.classList.add("window-minimize");
      const rect = popped.getBoundingClientRect();
      ridingWindow.style.setProperty(
        "--page-fold-dy",
        `${Math.max(0, Math.round(window.innerHeight - rect.bottom))}px`,
      );
      document.body.appendChild(ridingWindow);
      window.setTimeout(() => {
        ridingBackdrop.remove();
        ridingWindow.remove();
      }, 400);
      settleHashAfterDismiss();
    }
    patch(node.id, { maximized: false });
  };

  /** Exiting the fullscreen view: click sound + the slide-out ride +
   * restore into the page flow. silent=true keeps the Click.ogg for the
   * title bar / Escape only — out-of-bounds and OK dismissals are quiet. */
  const exitFullscreen = (silent = false) => {
    if (!silent) playLayeredAudio(MINIMIZE_SOUND);
    dismissMaximized();
  };

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitFullscreen();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [maximized, node.id, patch]);

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

  // Minimize and Close share the same window behaviour. Close consults the
  // window-close-attempt event first: only refusals play the crunchy kick
  // and keep the window open. Leaving the fullscreen view is the minimize
  // sound + restore-into-the-page for every exit (title bar, Escape, or
  // OK); the ✕ close from fullscreen restores silently. Outside of
  // fullscreen, minimize keeps its page-exit/collapse roles.
  const minimize = () => {
    if (maximized) {
      exitFullscreen();
      return;
    }
    if (leaves) {
      // Navigation is the fold here: pageSlide animates every departing
      // window (and plays the minimize click). Don't fold twice.
      leaves();
      return;
    }
    // Inline windows collapse to their title bar — no depart animation
    // (the slide-off is for maximized dismissals and page exits only).
    playLayeredAudio(MINIMIZE_SOUND);
    patch(node.id, { expanded: false, maximized: false });
  };

  const close = () => {
    // The crunchy kick backs every ✕ press: refused closes (Clippy veto,
    // "funny" windows) and successful ones alike.
    playLayeredAudio(CLOSE_SOUND);
    const funnyClose = hasTheme(node, "funny");
    // Refusal keeps the window open (see window-close-attempt below);
    // successful closings park/restore/leave after the crunch.
    const refused = !document.dispatchEvent(
      new CustomEvent("window-close-attempt", { cancelable: true }),
    );
    // "funny" windows refuse outright: the kick played, the window stays.
    if (funnyClose) return;
    if (!refused) {
      if (maximized) {
        // ✕ from fullscreen: the kick already ran, no minimize click —
        // slide out via the ride clone and restore into the page flow.
        dismissMaximized();
        return;
      }
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
    }
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
            // Entering fullscreen: the hash anchors the maximized window so
            // a refresh lands back on the revealed section. replaceState is
            // untouched by the pageSlide pushState patch — no transition.
            history.replaceState(null, "", `#${node.id}`);
            patch(node.id, { maximized: true });
            return;
          }
          // Restore button: slide-out dismissal (silent) + hash hand-off.
          dismissMaximized();
        }}
        onClose={close}
      />
      {!flags.minimized && (
        <div
          className={`window-body${maximized ? " maximized-window-body" : ""}`}
        >
          <Body
            node={node}
            expanded={expanded}
            maximized={maximized}
            // OK is the dismiss affordance in fullscreen (silent close —
            // Click.ogg stays with the title bar / Escape / backdrop),
            // playing the same departing fold before the page restore.
            onOk={maximized ? () => exitFullscreen(true) : undefined}
          />
        </div>
      )}
    </div>
  );

  // The maximized window stays where it is in the tree: the dimmed layer
  // renders as a sibling and the window itself is lifted by fixed
  // positioning (see .window.maximized) — nothing is portaled away, so
  // permalinks, scroll targets and the element tree keep their window.
  if (maximized) {
    return (
      <>
        <div
          className="maximized-backdrop"
          data-window-id={node.id}
          // Every click lands on the dimmed layer (the window floats
          // above it): out-of-bounds dismissal, silent by rule.
          onClick={() => exitFullscreen(true)}
        />
        {window_}
      </>
    );
  }
  return window_;
}
