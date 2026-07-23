import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
} from "react";

/**
 * Module-level set of every OkButton currently mounted in the document.
 *
 * Sharing a single set across all OkButton instances lets them negotiate
 * keyboard navigation with each other without prop drilling, and without
 * a separate "navigation provider" component that would render `null`.
 */
const registeredButtons = new Set<HTMLButtonElement>();

/**
 * The current Tab handler installed on `document`, or `null` when no
 * OkButtons are mounted.  The first OkButton to mount installs the
 * handler; the last one to unmount removes it.
 */
let documentKeyDownHandler: ((event: KeyboardEvent) => void) | null = null;

let documentMouseDownHandler: (() => void) | null = null;

let documentEscapeHandler: ((event: KeyboardEvent) => void) | null = null;

/**
 * Number of currently mounted OkButton instances.  Used to decide when
 * to install / remove the document-level handlers.
 */
let mountCount = 0;

/**
 * Returns the ordered list of currently visible OkButtons, sorted by
 * document order.
 */
const getVisibleOkButtons = (): HTMLButtonElement[] => {
  const candidates = Array.from(registeredButtons);
  return candidates
    .filter((candidate) => isElementVisible(candidate))
    .sort((a, b) => {
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });
};

const isElementVisible = (element: HTMLElement): boolean => {
  if (!element.isConnected) {
    return false;
  }

  if (
    element.hasAttribute("hidden") ||
    element.getAttribute("aria-hidden") === "true"
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  for (
    let parent: HTMLElement | null = element.parentElement;
    parent && parent !== document.body;
    parent = parent.parentElement
  ) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === "none" || parentStyle.visibility === "hidden") {
      return false;
    }
  }

  return true;
};

/**
 * The shared navigation state lives on the OkButton module, but each
 * instance needs to read/mutate it.  Using a plain object (not React
 * state) avoids re-renders — the keydown handler reads and writes it
 * directly.
 */
const navigationState: {
  /** True once the first Tab on the page has been intercepted. */
  initialTabHandled: boolean;
  /** True while the user is in the OkButton navigation ring. */
  ringActive: boolean;
  /** Index of the currently focused OkButton within the visible list. */
  focusIndex: number;
} = {
  initialTabHandled: false,
  ringActive: false,
  focusIndex: -1,
};

const handleDocumentKeyDown = (event: KeyboardEvent): void => {
  if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const visibleButtons = getVisibleOkButtons();
  if (visibleButtons.length === 0) {
    navigationState.initialTabHandled = true;
    return;
  }

  const isShift = event.shiftKey;

  if (!navigationState.initialTabHandled) {
    navigationState.initialTabHandled = true;
    navigationState.ringActive = true;
    navigationState.focusIndex = 0;
    event.preventDefault();
    const firstButton = visibleButtons[0];
    if (firstButton) {
      firstButton.focus();
    }
    return;
  }

  const activeElement = document.activeElement;
  const focusedButtonIndex = visibleButtons.findIndex(
    (button) => button === activeElement,
  );

  if (focusedButtonIndex === -1) {
    if (!navigationState.ringActive) {
      return;
    }
    event.preventDefault();
    navigationState.focusIndex = isShift ? visibleButtons.length - 1 : 0;
    const target = visibleButtons[navigationState.focusIndex];
    if (target) {
      target.focus();
    }
    return;
  }

  event.preventDefault();
  const nextIndex = isShift
    ? (focusedButtonIndex - 1 + visibleButtons.length) % visibleButtons.length
    : (focusedButtonIndex + 1) % visibleButtons.length;
  navigationState.focusIndex = nextIndex;
  const nextButton = visibleButtons[nextIndex];
  if (nextButton) {
    nextButton.focus();
  }
};

const handleDocumentMouseDown = (): void => {
  navigationState.ringActive = false;
  navigationState.focusIndex = -1;
};

const handleDocumentEscape = (event: KeyboardEvent): void => {
  if (event.key === "Escape") {
    navigationState.ringActive = false;
    navigationState.focusIndex = -1;
  }
};

const installDocumentHandlers = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (documentKeyDownHandler !== null) {
    return;
  }
  documentKeyDownHandler = handleDocumentKeyDown;
  documentMouseDownHandler = handleDocumentMouseDown;
  documentEscapeHandler = handleDocumentEscape;
  document.addEventListener("keydown", documentKeyDownHandler, true);
  document.addEventListener("mousedown", documentMouseDownHandler, true);
  document.addEventListener("keydown", documentEscapeHandler, true);
};

const removeDocumentHandlers = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (documentKeyDownHandler !== null) {
    document.removeEventListener("keydown", documentKeyDownHandler, true);
    documentKeyDownHandler = null;
  }
  if (documentMouseDownHandler !== null) {
    document.removeEventListener("mousedown", documentMouseDownHandler, true);
    documentMouseDownHandler = null;
  }
  if (documentEscapeHandler !== null) {
    document.removeEventListener("keydown", documentEscapeHandler, true);
    documentEscapeHandler = null;
  }
};

export type OkButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  /** Optional click handler — the button always renders the text "OK". */
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

/**
 * The Section's "OK" button.
 *
 * This component is the entry point for two related accessibility
 * features:
 *
 * 1. The first Tab keypress on the page automatically focuses the next
 *    visible "OK" button.
 * 2. Once the ring is active, Tab and Shift+Tab cycle through only the
 *    visible "OK" buttons on the page in DOM order, wrapping at the
 *    ends.
 *
 * Implementation notes:
 *  - Each OkButton registers itself in a module-level Set via a ref
 *    callback.  No document querySelectors are needed; the set is the
 *    single source of truth for which buttons currently exist.
 *  - The very first OkButton to mount installs a single document-level
 *    keydown handler.  The last one to unmount removes it.  There is
 *    no separate "navigation provider" component rendering `null`.
 *  - The navigation state (initialTabHandled, ringActive, focusIndex)
 *    lives on the module, not in React state, because the keydown
 *    handler reads/writes it synchronously without re-renders.
 */
export const OkButton = ({ onClick, ...rest }: OkButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Install/remove the document-level Tab handler based on whether any
  // OkButtons are mounted.  This is the only effect; the button itself
  // is what mounts and unmounts, not a separate invisible component.
  useEffect(() => {
    mountCount += 1;
    installDocumentHandlers();
    return () => {
      mountCount -= 1;
      if (mountCount === 0) {
        removeDocumentHandlers();
        navigationState.initialTabHandled = false;
        navigationState.ringActive = false;
        navigationState.focusIndex = -1;
      }
    };
  }, []);

  // Ref callback: register / unregister this button in the module-level
  // set whenever the DOM element is attached or detached.
  const setButtonRef = useCallback((node: HTMLButtonElement | null) => {
    const previous = buttonRef.current;
    if (previous) {
      registeredButtons.delete(previous);
    }
    buttonRef.current = node;
    if (node) {
      registeredButtons.add(node);
    }
  }, []);

  return (
    <button {...rest} ref={setButtonRef} onClick={onClick}>
      OK
    </button>
  );
};
