/**
 * Section state management for collapse/expand behavior.
 * Uses a Map to track collapse state per section UUID.
 */

interface SectionState {
  isCollapsed: boolean;
}

const sectionStates = new Map<string, SectionState>();

/**
 * Get the collapse state for a section.
 * Returns true if the section is collapsed, false if expanded.
 * If the section has no state, returns true (collapsed by default).
 */
export function getSectionState(uuid: string): boolean {
  const state = sectionStates.get(uuid);
  if (state !== undefined) {
    return state.isCollapsed;
  }
  // New sections start collapsed by default
  return true;
}

/**
 * Set the collapse state for a section.
 */
export function setSectionState(uuid: string, isCollapsed: boolean): void {
  sectionStates.set(uuid, { isCollapsed });
}

/**
 * Initialize a section with optional initial state.
 * Returns whether the section is initially collapsed.
 */
export function initSectionState(
  uuid: string,
  initiallyCollapsed: boolean = true,
): boolean {
  const currentState = sectionStates.get(uuid);
  if (!currentState) {
    sectionStates.set(uuid, { isCollapsed: initiallyCollapsed });
    return initiallyCollapsed;
  }
  return currentState.isCollapsed;
}
