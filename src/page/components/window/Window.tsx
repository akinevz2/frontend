import type { ClassNames, Content } from "@/content/types";
import { useContent } from "../hooks";

export type WindowProps = {
  content: Content;
};

/**
 * Window component - Main window container with decorations.
 * useContent renders the recursive body and nested section windows.
 */
export function Window({ content }: WindowProps) {
  return useContent(content);
}

export type WindowBodyChildren = {
  content: Content;
};

export type WindowBodyProps = ClassNames & WindowBodyChildren;

export function WindowBody({ content }: WindowBodyProps) {
  return useContent(content);
}
