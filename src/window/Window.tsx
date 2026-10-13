import { useEffect } from "react";
import { createPortal } from "react-dom";
import { playLayeredAudio } from "@/lib/audio";
import { copyText } from "@/lib/clipboard";
import { Md } from "@/lib/markdown";
import { CopyAddon } from "./CopyAddon";
import { BannerView, EmbedView } from "./Embed";
import { OkButton } from "./OkButton";
import { Printout } from "./Printout";
import { TitleBar } from "./TitleBar";
import type { WindowChild, WindowNode } from "./model";
import { permalinkFor, useWindowStore } from "./state";
import { dataTheme, forcesExpanded } from "./themes";

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

function PermalinkButton({ node }: { node: WindowNode }) {
  const { permalinkMode } = useWindowStore();
  return (
    <div className="permalink-button-container">
      <button
        onClick={() =>
          copyText(
            permalinkFor(node, permalinkMode),
            "Permalink copied to clipboard!",
          )
        }
      >
        Permalink Here
      </button>
    </div>
  );
}

function Body({ node, expanded }: { node: WindowNode; expanded: boolean }) {
  const showOk = !expanded && !forcesExpanded(node);
  const showContent = expanded || Boolean(node.link);

  const content = (
    <>
      {node.status && (
        <p className="addon-status">
          status: <em>{node.status}</em>{" "}
          {node.link?.startsWith("/addons/") && (
            <CopyAddon src={node.link} text={node.copyText} />
          )}
        </p>
      )}
      {showContent && node.children.length > 0 && (
        <Children items={node.children} />
      )}
      {expanded && node.printout && <Printout src={node.printout} />}
    </>
  );

  if (showOk) {
    return (
      <div className="ok-row">
        {content}
        <OkButton node={node} />
      </div>
    );
  }

  return <>{content}</>;
}

export function Window({ node }: { node: WindowNode }) {
  const { flagsOf, patch } = useWindowStore();
  const flags = flagsOf(node.id);
  const maximized = Boolean(flags.maximized);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") patch(node.id, { maximized: false });
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [maximized, node.id, patch]);

  if (flags.closed) return null;

  // Windows without a heading are plain groups of content, not windows.
  if (!node.heading && !node.printout) {
    return <Body node={node} expanded />;
  }

  const expanded =
    forcesExpanded(node) || Boolean(flags.expanded || node.printout);

  const close = () => {
    patch(node.id, { closed: true });
    playLayeredAudio(CLOSE_SOUND);
    document.dispatchEvent(
      new CustomEvent("crunchy-kick-played", { cancelable: true }),
    );
  };

  const window_ = (
    <div
      id={maximized ? undefined : node.id}
      className={["window", maximized && "maximized", node.className]
        .filter(Boolean)
        .join(" ")}
      data-theme={dataTheme(node)}
    >
      <TitleBar
        node={node}
        maximized={maximized}
        onMinimize={() => patch(node.id, { expanded: false, maximized: false })}
        onMaximize={() => patch(node.id, { maximized: !maximized })}
        onClose={close}
      />
      {!flags.minimized && (
        <div
          className={`window-body${maximized ? " maximized-window-body" : ""}`}
        >
          {maximized && node.heading && <PermalinkButton node={node} />}
          <Body node={node} expanded={expanded} />
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
