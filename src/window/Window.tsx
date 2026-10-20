import { useEffect } from "react";
import { createPortal } from "react-dom";
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
  // top, then OK + Permalink. margin-top: auto only pushes the rail to the
  // bottom edge when the window is taller than its content, so nothing ever
  // scrolls underneath it. OK keeps its regular function (navigate when
  // linked) and closes the fullscreen view otherwise (via onOk).
  if (maximized) {
    return (
      <div className="maximized-content-col">
        {content}
        <div className="ok-row ok-row-bottom">
          <OkButton node={node} onOk={node.link ? undefined : onOk} />
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

  /** Exiting the fullscreen view: click sound + restore into the page. */
  const exitFullscreen = () => {
    playLayeredAudio(MINIMIZE_SOUND);
    patch(node.id, { maximized: false });
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
    forcesExpanded(node) ||
    Boolean(flags.expanded || node.embed) ||
    maximized;

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
    if (leaves) leaves();
    else patch(node.id, { expanded: false, maximized: false });
  };

  const close = () => {
    // Windows themed "funny" ARE the joke — pressing their ✕ always
    // crunches, even when the close goes through normally.
    const funnyClose = hasTheme(node, "funny");
    // The crunchy kick plays only when a window refuses to close (Clippy
    // saying no); successful closes pass silently and then
    // park/restore/leave as before.
    const refused = !document.dispatchEvent(
      new CustomEvent("window-close-attempt", { cancelable: true }),
    );
    if (funnyClose || refused) playLayeredAudio(CLOSE_SOUND);
    // "funny" windows refuse outright: the kick plays, the window stays.
    if (funnyClose) return;
    if (!refused) {
      if (maximized) {
        // ✕ from fullscreen: restore into the page, no sound.
        patch(node.id, { maximized: false });
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
    // (Refusals and funny windows played the crunchy kick above.)
  };

  const window_ = (
    <div
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
        onMaximize={() => patch(node.id, { maximized: !maximized })}
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
            // OK restores the window into the page when it has no link to
            // follow; linked windows keep their navigate-on-OK behaviour.
            // Deliberately silent: the minimize click (Click.ogg) is for the
            // title bar / Escape paths only.
            onOk={
              maximized ? () => patch(node.id, { maximized: false }) : undefined
            }
          />
        </div>
      )}
    </div>
  );

  return maximized
    ? createPortal(
        <div className="maximized-backdrop">{window_}</div>,
        document.body,
      )
    : window_;
}
