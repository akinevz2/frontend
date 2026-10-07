"use client";

import { flattenClassNames } from "@/content";
import { isPageContent, isSectionContent } from "@/content";
import { Window } from "./Window";
import type React from "react";
import type { ReactNode } from "react";
import type { ClassNames, PageContent } from "@/content/types";
export type WindowBodyChildren =
  | { content: React.ReactElement }
  | { content: PageContent };

export type WindowBodyProps = ClassNames & WindowBodyChildren;

export function WindowBody({ content: pageContent }: WindowBodyProps) {
  return useRender(pageContent);
}

function useRender(pageContent: PageContent, key: number = 0) {
  const classesWindow = "window-body";
  function renderDivOrContent(pageContent: PageContent, otherwise: (isContent: PageContent) => ReactNode): ReactNode {
    if (isSectionContent(pageContent) || isPageContent(pageContent)) {
      return otherwise(pageContent);
    }
    return <div className="window-body-content">{pageContent}</div>;
  }
  const WindowBodyInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return renderDivOrContent(pageContent, (isContent) => {
      if (!isContent) return;
      if (typeof (isContent) !== "object") return isContent;
      const classesFlattened = "classNames" in isContent ? flattenClassNames([classesWindow, ...isContent.classNames]) : classesWindow;
      return (
        <div key={key} className={classesFlattened}>
          {children}
        </div>
      );
    })
  }
  return <WindowBodyInner>
    {renderDivOrContent(pageContent, () => {
      <Window content={pageContent} />
    })}
  </WindowBodyInner>
}



