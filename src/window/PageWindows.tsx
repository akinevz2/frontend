import { useMemo, type ReactNode } from "react";
import type { Section } from "@/content";
import { buildWindows } from "./model";
import {
  WindowProvider,
  usePageReturn,
  usePermalinkTarget,
  useReveal,
  useRememberLeave,
  useWindowStore,
  type PermalinkMode,
} from "./state";
import { Window } from "./Window";

function Roots({ children }: { children?: ReactNode }) {
  const { windows } = useWindowStore();
  // The reveal handler subscribes FIRST (effects run in hook order):
  // the permalink confirm below dispatches on mount and must not miss
  // its handler.
  useReveal();
  usePermalinkTarget();
  usePageReturn();
  useRememberLeave();
  return (
    <>
      {windows
        .filter((w) => w.depth === 0)
        .map((w) => (
          <Window key={w.id} node={w} />
        ))}
      {children}
    </>
  );
}

type Props = {
  content: Section | Section[];
  permalinkMode?: PermalinkMode;
  /** Closing or minimising a top-level window calls this instead. */
  onLeave?: (() => void) | undefined;
  /** Extra windows rendered after the content windows (e.g. a form). */
  children?: ReactNode;
};

/** Renders JSON content as top-level windows inside the page container. */
export function PageWindows({
  content,
  permalinkMode = "hash",
  onLeave,
  children,
}: Props) {
  const roots = useMemo(() => buildWindows(content), [content]);
  return (
    <WindowProvider
      roots={roots}
      permalinkMode={permalinkMode}
      onLeave={onLeave}
    >
      <Roots>{children}</Roots>
    </WindowProvider>
  );
}
