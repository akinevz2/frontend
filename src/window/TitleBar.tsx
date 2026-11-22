import type { WindowNode } from "./model";

type Props = {
  node: WindowNode;
  maximized: boolean;
  /** Summoned presentation (§7.2): a small Clippy icon sits in the bar
   * and the controls reduce to the close button. */
  summoned?: boolean | undefined;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
};

export function TitleBar({
  node,
  maximized,
  summoned,
  onMinimize,
  onMaximize,
  onClose,
  onDoubleClick,
}: Props) {
  const heading = node.heading ?? "";
  return (
    <div className="title-bar" onDoubleClick={onDoubleClick}>
      {summoned && (
        <img className="title-bar-clippy" src="/Clippy.png" alt="" />
      )}
      <div className="title-bar-text" id={`${node.id}-title`}>
        {node.link ? (
          <a
            href={node.link}
            {...(node.externalLink || /^https?:/.test(node.link)
              ? { rel: "noreferrer" }
              : {})}
          >
            {heading}
          </a>
        ) : (
          heading
        )}
      </div>
      <div className="title-bar-controls">
        {!summoned && <button aria-label="Minimize" onClick={onMinimize} />}
        {!summoned && node.depth > 0 && (
          <button
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={onMaximize}
          />
        )}
        <button aria-label="Close" onClick={onClose} />
      </div>
    </div>
  );
}
