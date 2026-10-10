import type { Heading } from "../../../content/types";
import { WindowDecorations } from "./WindowDecorations";

export interface WindowTitlebarProps {
  heading: Heading | null | undefined;
  sectionUuid: string;
}

export function WindowTitlebar({ heading, sectionUuid }: WindowTitlebarProps) {
  return heading === null || heading === undefined ? null : (
    <div className="title-bar">
      <div className="title-bar-text">{heading}</div>
      <div className="title-bar-controls">
        <WindowDecorations sectionUuid={sectionUuid} />
      </div>
    </div>
  );
}
