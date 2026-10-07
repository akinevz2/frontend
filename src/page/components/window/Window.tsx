import { WindowBody } from "./WindowBody";
import { WindowTitlebar } from "./Decorations";
import { isSectionContent } from "@/content";
import type { PageContent } from "@/content/types";

/**
 * Window component - Main window container with decorations
 */
export function Window({
  content,
}: {
  content: PageContent;
}) {
  if (isSectionContent(content)) {
    const { heading } = content;
    return (
      <section className="window" >
        <WindowTitlebar heading={heading} />
        <WindowBody content={content} />
      </section>
    );
  }
  return <section className="window" >
    <WindowBody content={content} />
  </section>
}