import type { Section } from "../types";

export function useContentMarkdown(
  content: any,
  printout?: any,
): {
  markedContent: React.ReactNode;
  markedPrintout?: React.ReactNode;
} {
  return {
    markedContent: content as React.ReactNode,
    markedPrintout: printout ? (printout as React.ReactNode) : undefined,
  };
}
