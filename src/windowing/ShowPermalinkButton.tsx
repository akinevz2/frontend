import { type MouseEvent } from "react";

type ShowPermalinkButtonProps = {
  showPermalink: boolean;
  hasHeading: boolean;
  onPermalinkClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Show permalink button component that displays a clickable link to copy/share the current section's URL.
 */
export function ShowPermalinkButton({
  showPermalink,
  hasHeading,
  onPermalinkClick,
}: ShowPermalinkButtonProps) {
  if (!showPermalink || !hasHeading) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        placeItems: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={onPermalinkClick}
        style={{
          background: "transparent",
          border: "1px solid currentColor",
          padding: "4px 8px",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Permalink Here
      </button>
    </div>
  );
}
