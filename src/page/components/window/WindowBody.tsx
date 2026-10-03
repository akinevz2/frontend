"use client";

import { useMemo } from "react";
import type { SectionContent } from "../../types";
export interface WindowBodyProps {
  section: SectionContent;
  children?: React.ReactNode;
}

export function WindowBody({ section, children }: WindowBodyProps) {
  const { content, printout } = section;


  return (
    <div className="window-body">
      {markedContent}
      {markedPrintout ? markedPrintout : null}
      {children}
    </div>
  );
}
