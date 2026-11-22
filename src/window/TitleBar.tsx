import type { WindowNode } from "./model";
import { DRAG_HINT } from "./summonDrag";

type Props = {
  node: WindowNode;
  maximized: boolean;
  /** Summoned presentation (§7.2): a small Clippy icon sits in the bar
   * and the controls reduce to the close button. */
  summoned?: boolean | undefined;
  /** Dragging (§7.4): pointer events on the title bar only; arrow keys
   * move the window while the bar is focused; the movement
   * instructions ride aria-describedby. */
  onDragPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
};

export function TitleBar({
  node,
  maximized,
  summoned,
  onDragPointerDown,
  onDragKeyDown,
  onMinimize,
  onMaximize,
  onClose,
  onDoubleClick,
}: Props) {
  const heading = node.heading ?? "";
  return (
    <div
      className="title-bar"
      onDoubleClick={onDoubleClick}
      {...(summoned
        ? {
            tabIndex: 0,
            "aria-describedby": `${node.id}-drag-hint`,
            onPointerDown: onDragPointerDown,
            onKeyDown: onDragKeyDown,
          }
        : {})}
    >
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
      {summoned && (
        // The movement instructions (§7.4): visually hidden, referenced
        // by the title bar's aria-describedby.
        <span
          id={`${node.id}-drag-hint`}
          className="drag-hint"
          aria-hidden="false"
        >
          {DRAG_HINT}
        </span>
      )}
    </div>
  );
}
