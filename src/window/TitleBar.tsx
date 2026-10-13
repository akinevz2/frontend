import type { WindowNode } from "./model";

type Props = {
  node: WindowNode;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
};

export function TitleBar({
  node,
  maximized,
  onMinimize,
  onMaximize,
  onClose,
}: Props) {
  const heading = node.heading ?? "";
  return (
    <div className="title-bar">
      <div className="title-bar-text">
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
        <button aria-label="Minimize" onClick={onMinimize} />
        {node.depth > 0 && (
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
