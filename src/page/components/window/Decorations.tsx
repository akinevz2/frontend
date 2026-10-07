import type { Heading } from "../../../content/types";
import { WindowDecorations } from "./MinimizeMaximizeClose";

export function WindowTitlebar({ heading }: { heading: Heading | null | undefined }) {
  return ((heading === null) ? null :
    <div className="window-titlebar">
      {heading ? <div className="window-titlebar-text">{heading}</div> : null}
      <WindowDecorations />
    </div>
  );
}
