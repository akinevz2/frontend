import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  clampEntry,
  readSummoned,
  summonPosition,
  writeSummoned,
  type SummonedEntry,
} from "@/lib/learningStorage";
import { CLIPPY_LINK } from "@/lib/clippy";
import { useWindowStore } from "./state";
import { setTrigger, refocusTrigger } from "./summonFocus";
import { registerLessonContainer } from "./summonDrag";

/**
 * The lesson summon machinery (docs/LEARNING_PLAN.md §7.1–§7.3).
 *
 * Mounted INSIDE the lesson's PageWindows tree (it needs the window
 * store) with a ref to the lesson container it floats within. Three
 * cooperating pieces, all component-local per the Phase 0 addendum —
 * no new signal names:
 *
 * 1. A delegated CAPTURE-phase click handler on the container
 *    (precedent: useRememberLeave) intercepts plain left clicks on
 *    fragment links that name a hint on this page (`#hint-anchor` —
 *    the hint window's real id); modified clicks and every other href
 *    pass untouched. Intercepted clicks `preventDefault` — no history
 *    entry, no address-bar change — and open the Clippy dialogue.
 * 2. The dialogue: a native <dialog> showModal'd (free focus trap and
 *    Escape), skinned as an XP message box, Clippy.png beside the text
 *    (decorative, the SAME asset the mascot uses — no fork of Clippy's
 *    code). Cancel/Escape closes and refocuses the trigger; OK closes
 *    and summons.
 * 3. Summoning: the hint window's own store flags (patch — the same
 *    mechanism every inline reveal uses) get `summoned` + its position
 *    (opposite the trigger's column, continuing the zig-zag) and focus
 *    moves into it. Summoning an already-summoned hint focuses rather
 *    than duplicates.
 *
 * Persistence (§7.3) is an effect over the store's summoned flags:
 * every mutation (summon here, dismissal in Window) lands in
 * sessionStorage through the pure learningStorage module — written on
 * mutation only, all access guarded. On mount the persisted entries
 * are re-summoned WITHOUT animation, unknown ids dropped, positions
 * clamped back inside the container.
 */

const fallbackRect = (el: HTMLElement | null) => ({
  width: el?.getBoundingClientRect().width ?? 320,
  height: el?.getBoundingClientRect().height ?? 200,
});

/** The Clippy prompt: a native <dialog> (showModal = free focus trap +
 * Escape), an XP message box skin, Clippy.png decorative at 48px. */
function ClippyPrompt({
  hint,
  onOk,
  onCancel,
}: {
  hint: { id: string; heading: string };
  onOk: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // jsdom and older engines lack showModal: degrade to a plain open
    // dialog rather than crash the lesson.
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute("open", "");
    }
    return () => {
      try {
        dialog.close();
      } catch {
        dialog.removeAttribute("open");
      }
    };
  }, [hint]);
  return (
    <dialog
      ref={dialogRef}
      className="clippy-prompt"
      aria-label="Clippy"
      // Escape (the dialog's cancel) is OUR close: focus returns to the
      // trigger link, the dialog closes in the cleanup above.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <img src="/Clippy.png" alt="" />
      <p>
        it looks like you're reading about {hint.heading}. would you like a
        hint?
      </p>
      <div className="clippy-prompt-row">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onOk}>OK</button>
      </div>
    </dialog>
  );
}

export function LessonSummon({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const { windows, patch, flagsOf } = useWindowStore();
  // This layer re-renders with the store (flagsOf changes on any
  // patch) — the persistence effect below reads the CURRENT flags.
  const hints = useMemo(
    () => windows.filter((w) => w.kind === "hint"),
    [windows],
  );
  const hintIds = useMemo(() => new Set(hints.map((w) => w.id)), [hints]);
  const [prompt, setPrompt] = useState<{
    id: string;
    heading: string;
    trigger: HTMLElement;
  } | null>(null);

  // The drag controller's clamp surface (§7.4): the lesson container.
  useEffect(
    () => registerLessonContainer(containerRef.current ?? null),
    [containerRef],
  );

  const summonedNow = useMemo<SummonedEntry[]>(() => {
    const entries: SummonedEntry[] = [];
    for (const hint of hints) {
      if (!flagsOf(hint.id).summoned) continue;
      const position = flagsOf(hint.id).position;
      entries.push({
        id: hint.id,
        x: position?.x ?? 0,
        y: position?.y ?? 0,
        z: position?.z ?? 1,
      });
    }
    return entries;
  }, [hints, flagsOf]);

  // Restore (§7.3): read once per mount, unknown ids dropped, positions
  // clamped into the viewport, re-summoned WITHOUT animation.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || hints.length === 0) return;
    const persisted = readSummoned(location.pathname).filter((entry) =>
      hintIds.has(entry.id),
    );
    if (persisted.length === 0) return;
    for (const entry of persisted) {
      const { width, height } = fallbackRect(document.getElementById(entry.id));
      const clamped = clampEntry(entry, {
        maxX: window.innerWidth - width,
        maxY: window.innerHeight - height,
      });
      patch(entry.id, {
        summoned: true,
        silentSummon: true,
        position: clamped,
      });
    }
  }, []);

  // Persist on MUTATION (summon / dismiss — the store's flags are the
  // single source; Phase 4's drop/raise writes land the same way).
  // Never during pointermove: there is no pointermove writer in this
  // component.
  useEffect(() => {
    const stored = readSummoned(location.pathname);
    const same =
      stored.length === summonedNow.length &&
      [...stored]
        .sort((a, b) => a.id.localeCompare(b.id))
        .every((entry, index) => {
          const now = [...summonedNow].sort((a, b) => a.id.localeCompare(b.id))[
            index
          ]!;
          return (
            entry.id === now.id &&
            entry.x === now.x &&
            entry.y === now.y &&
            entry.z === now.z
          );
        });
    if (same) return;
    writeSummoned(location.pathname, summonedNow);
  }, [summonedNow]);

  // The delegated capture-phase interceptor (precedent:
  // useRememberLeave — modifier clicks already skip there).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      // Fragment links only — the Clippy trigger link is NOT one.
      if (!href?.startsWith("#") || href === CLIPPY_LINK) return;
      let fragment: string;
      try {
        fragment = decodeURIComponent(href.slice(1));
      } catch {
        return;
      }
      if (!hintIds.has(fragment)) return;
      // No history entry, no address-bar change: the browser's default
      // fragment jump is replaced by the dialogue.
      event.preventDefault();
      const hint = hints.find((w) => w.id === fragment)!;
      setTrigger(fragment, anchor);
      setPrompt({
        id: fragment,
        heading: hint.heading ?? fragment,
        trigger: anchor,
      });
    };
    container.addEventListener("click", onClick, true);
    return () => container.removeEventListener("click", onClick, true);
  }, [containerRef, hintIds, hints]);

  const summon = (id: string) => {
    const container = containerRef.current;
    if (!container) return;
    // Already summoned: focus rather than duplicate (§7.2).
    if (flagsOf(id).summoned) {
      document.getElementById(id)?.focus();
      return;
    }
    const element = document.getElementById(id);
    const hint = fallbackRect(element);
    const bounds = container.getBoundingClientRect();
    const trigger = prompt?.trigger.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
    // The zig-zag (§6) reads the lesson layout: a trigger in the left
    // half of the container sends the hint to the right edge. The
    // position itself is VIEWPORT-space (position: fixed — the roaming
    // space is the viewport, revised per the author), clamped inside
    // the viewport by summonPosition.
    const goesRight =
      trigger.left - bounds.left + trigger.width / 2 < bounds.width / 2;
    const position = summonPosition(
      {
        left: trigger.left,
        top: trigger.top,
        width: trigger.width,
        height: trigger.height,
      },
      goesRight,
      { width: window.innerWidth, height: window.innerHeight },
      hint,
      summonedNow,
    );
    patch(id, { summoned: true, silentSummon: false, position });
    // Focus moves into it on summon (the Window's own effect also
    // runs; the rAF here covers the mount frame).
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const cancelPrompt = () => {
    // Cancel / Escape: close and return focus to the trigger link.
    if (prompt) refocusTrigger(prompt.id);
    setPrompt(null);
  };

  return prompt === null ? null : (
    <ClippyPrompt
      hint={{ id: prompt.id, heading: prompt.heading }}
      onOk={() => {
        summon(prompt.id);
        setPrompt(null);
      }}
      onCancel={cancelPrompt}
    />
  );
}

/** Testing seam: the fragment-interception decision, isolated so the
 * jsdom test can exercise modified-click and foreign-href skipping
 * without mounting the tree. */
export function summonTargetOf(
  href: string | null,
  hintIds: Set<string>,
): string | undefined {
  if (!href?.startsWith("#") || href === CLIPPY_LINK) return undefined;
  let fragment: string;
  try {
    fragment = decodeURIComponent(href.slice(1));
  } catch {
    return undefined;
  }
  return hintIds.has(fragment) ? fragment : undefined;
}
