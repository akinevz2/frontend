import type { Heading } from "../../content/types";

export function WindowTitlebar({ heading }: { heading: Heading | undefined }) {
  return (
    <div className="window-titlebar">
      {heading ? <div className="window-title">{heading}</div> : null}
    </div>
  );
}
