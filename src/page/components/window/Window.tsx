import { WindowBody } from "./WindowBody";
import { WindowTitlebar } from "./Decorations";
import type { Content } from "../../types";

/**
 * Window component - Main window container with decorations
 */
export function Window({
  depth,
  treeIndex,
  content,
}: {
  depth: number;
  treeIndex: string;
  content: Content<{}>;
}) {
  const { heading } = content;
  // const uuid = useUUID();
  // const metadata: ContentSectionMetadata = {
  // uuid,
  // depth,
  // treeIndex,
  // };
  // const structuralContent: PageContent = { ...content, metadata };
  return (
    <div className="window-container">
      <WindowTitlebar heading={heading} />
      <WindowBody section={content} />
    </div>
  );
}
