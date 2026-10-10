// Combined hooks file - all hooks moved from src/hooks/
// This consolidates all hook implementations in one location as requested

import { flattenClassNames, isSectionContent } from "@/content";
import type {
  SectionContent,
  SectionContentMetadata,
  WithMetadata,
} from "../../content/types";
import {
  Fragment,
  isValidElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { WindowTitlebar } from "./window/WindowTitlebar";
import { isForceExpandedTheme } from "@/content/themeEngine";
import { OkButton } from "./window/OkButton";
import { useSection } from "./SectionContext";

/**
 * Hook for preloading resources
 */
export function usePreload() {
  // STUB: This hook is ready to be fully implemented
  // Implementation will be completed when we can determine the exact
  // preloading requirements based on site content
  return {
    preload: () => {},
    preloadPage: () => Promise.resolve(),
    preloadSection: () => {},
  };
}

/**
 * Hook for managing route hash state and change notifications
 */
export interface RouteHashState {
  hash: string;
  isLoading: boolean;
}

export type HashChangeHandler = (newHash: string) => void;

export function useRouteHash(): RouteHashState {
  const [hash] = useState<string>("");
  const [isLoading] = useState<boolean>(false);

  // STUB: This hook is ready to be fully implemented
  // Implementation will be completed when we can determine the exact
  // hash change requirements based on site navigation needs
  useEffect(() => {
    // Stub implementation - actual functionality to be added later
  }, []);

  return { hash, isLoading };
}

/**
 * Enhanced hook for route hash with validation
 */
export function useRouteHashWithValidation(
  initialHash: string = "",
): RouteHashState & {
  isValid: boolean;
  validate: () => boolean;
} {
  const [hash] = useState<string>(initialHash);
  const [isLoading] = useState<boolean>(false);

  // STUB: This hook is ready to be fully implemented
  // Implementation will be completed when exact validation requirements are known
  useEffect(() => {
    // Stub implementation - actual functionality to be added later
  }, []);

  const validateLocal = () => true;
  const isValid = validateLocal();

  return {
    hash,
    isLoading,
    isValid,
    validate: validateLocal,
  };
}

/**
 * Hook for managing hash-based navigation with automatic state management
 */
export function useHashNavigation(initialHash: string = "") {
  const [hash] = useState<string>(initialHash);
  const [isLoading] = useState<boolean>(false);

  // STUB: This hook is ready to be fully implemented
  // Implementation will be completed when navigation requirements are clear
  useEffect(() => {
    // Stub implementation - actual functionality to be added later
  }, []);

  return {
    hash,
    isLoading,
    navigateToHash: () => {},
  };
}

/**
 * Navigate Away Hook
 * Caches active section state to restore scroll position when returning
 * STUB: Implementation to be completed when navigation flow is clearer
 */
export function useNavigateAway(): {
  cacheActiveSection: (sectionId: string) => void;
  getCacheState: () => Record<string, unknown>;
} {
  // STUB: This hook is ready to be fully implemented
  return {
    cacheActiveSection: () => {
      // Implementation will handle caching of scroll positions and state
    },
    getCacheState: () => {
      // Implementation will return cached state for restoration
      return {};
    },
  };
}

/**
 * Clippy Easter Egg Hook
 * Registers global listener to summon the easter egg
 * STUB: Implementation to be completed when specific easter egg behavior is defined
 */
export function useClippyEasterEgg(): {
  activate: () => void;
  isActivated: boolean;
} {
  // STUB: This hook is ready to be fully implemented
  const [isActivated, setIsActivated] = useState(false);

  return {
    activate: () => {
      // Implementation will register global handler for easter egg activation
      setIsActivated(true);
    },
    isActivated,
  };
}

/** Resets the section to its initially collapsed state. */
export function useMinimizeHandle(uuid: string): {
  handleMinimize: () => void;
} {
  const section = useSection(uuid);
  return {
    handleMinimize: () => {
      section.setCollapsed(true);
    },
  };
}

/**
 * Maximize Handle Hook
 * Attaches to maximize window button
 * STUB: Implementation to be completed when exact UI behavior is determined
 */
export function useMaximizeHandle(): {
  handleMaximize: () => void;
} {
  // STUB: This hook is ready to be fully implemented
  return {
    handleMaximize: () => {
      // Implementation will attach maximize behavior to window buttons
    },
  };
}

/**
 * Close Handle Hook
 * Attaches to close window button
 * STUB: Implementation to be completed when exact UI behavior is determined
 */
export function useCloseHandle(): {
  handleClose: () => void;
} {
  // STUB: This hook is ready to be fully implemented
  return {
    handleClose: () => {
      // Implementation will attach close behavior to window buttons
    },
  };
}

type MetadataSection = SectionContent<WithMetadata> & WithMetadata;

function specializePageContent(value: unknown): MetadataSection | null {
  if (!isSectionContent(value) || !("metadata" in value)) return null;
  return value as MetadataSection;
}

function specializeSectionContent(
  value: unknown,
): SectionContent<WithMetadata> | null {
  return isSectionContent(value)
    ? (value as SectionContent<WithMetadata>)
    : null;
}

function stampMetadata(
  content: unknown,
  depth: number,
  index: string,
): unknown {
  const section = specializeSectionContent(content);
  if (!section) return content;

  const metadata: SectionContentMetadata = {
    uuid: crypto.randomUUID(),
    depth,
    index,
  };

  const children = section.content;
  const stampedChildren = Array.isArray(children)
    ? children.map((child, i) =>
        stampMetadata(child, depth + 1, `${index}.${i}`),
      )
    : children !== undefined
      ? stampMetadata(children, depth + 1, `${index}.0`)
      : undefined;

  return {
    ...section,
    metadata,
    content: stampedChildren,
  } as MetadataSection;
}

function renderMarkdown(content: string): ReactNode {
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
      {content}
    </ReactMarkdown>
  );
}

function SectionView({ content }: { content: MetadataSection }) {
  const { heading, metadata, theme } = content;
  const className = "className" in content ? content.className : undefined;
  const classNames = "classNames" in content ? content.classNames : undefined;
  const forceExpanded = theme ? isForceExpandedTheme(theme) : false;
  const section = useSection(metadata.uuid);
  const classes = flattenClassNames([
    "window",
    ...(classNames ?? []),
    ...(className ? [className] : []),
  ]);

  const shouldShowRevealButton =
    !forceExpanded && section.isCollapsed && Boolean(heading);

  const handleReveal = () => {
    section.setCollapsed(false);
  };

  return (
    <section className={classes}>
      <WindowTitlebar heading={heading} sectionUuid={metadata.uuid} />
      {shouldShowRevealButton ? (
        <div
          style={{ display: "flex", flexDirection: "column", padding: "1em" }}
        >
          <OkButton onClick={handleReveal} />
        </div>
      ) : (
        renderContent(content.content)
      )}
    </section>
  );
}

function renderSection(content: MetadataSection): ReactNode {
  return <SectionView content={content} key={content.metadata.uuid} />;
}

function renderContent(content: unknown): ReactNode {
  if (content === null || content === undefined) return null;
  if (typeof content === "string") return renderMarkdown(content);
  if (typeof content !== "object") return content as ReactNode;
  if (isValidElement(content)) return content;

  if (Array.isArray(content)) {
    return content.map((item, index) => {
      const metadata =
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "metadata" in item
          ? (item as { metadata: SectionContentMetadata }).metadata
          : null;
      return (
        <Fragment key={metadata?.uuid ?? index}>{renderContent(item)}</Fragment>
      );
    });
  }

  const section = specializePageContent(content);
  return section ? renderSection(section) : null;
}

export function useContent<T extends SectionContent>(content: T): ReactNode {
  const stamped = useMemo(() => stampMetadata(content, 0, "0"), [content]);

  return renderContent(stamped);
}
