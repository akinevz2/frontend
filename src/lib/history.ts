import { onSignal } from "@/lib/signals";

/** The history owner: the ONE module that writes the window system's
 * bookmarks into the session history. The bus carries the commands (the
 * maximized view's push, the off-site departure's hash-free bookmark,
 * the post-dismissal settle) and the handlers attached at boot perform
 * them; nothing else in the app writes our state key.
 *
 * The bookmark lives in the entry's STATE payload, not the URL: an
 * entry that names a window keeps a clean address bar, and the payload
 * survives the cross-document round trip (leave through the maximized
 * OK, come back through the browser back — a fresh boot reads the
 * bookmark and reveals the section without any hash to restore it
 * from). Whatever state the entry already holds (react-router's
 * usr/key/idx) is preserved: the bookmark is one merged key.
 *
 * The pushState WRAPPER is not ours — the pageSlide theme intercepts
 * history.pushState to drive its page transitions. Same-path pushes
 * (every anchor this module writes) stay silent there by design: the
 * maximized view's entry is a UI entry, not a page arrival. */

/** The shape of the state payloads this module reads and writes. */
type EntryState = { window?: string } & Record<string, unknown>;

/** The current entry's state with our key merged in (react-router's own
 * keys survive the merge — they are read back on popstate traversals). */
const withBookmark = (id?: string): EntryState => {
  const state: EntryState = { ...((history.state ?? {}) as EntryState) };
  if (id) state.window = id;
  else delete state.window;
  return state;
};

export function attachHistoryBookmarks(): () => void {
  const offAnchor = onSignal("history:anchor", ({ id, url, mode }) => {
    if (mode === "push") history.pushState(withBookmark(id), "", url);
    else history.replaceState(withBookmark(id), "", url);
  });
  const offRemember = onSignal("history:remember", ({ id, url }) => {
    history.replaceState({ ...withBookmark(id), window: id }, "", url);
  });
  // The arrival marker: every in-document page commit is a TRAVERSAL —
  // this document is a browsing session, never a fresh permalink again
  // (see traversedOnce). The pageSlide theme announces commits on the
  // bus: page:navigated for the pushState wrapper's and the popstate
  // theme's cross-page commits, page:returned for the same-path
  // traversals. Both are dispatched synchronously BEFORE the router's
  // re-render remounts a page — a landing's initialFlags reads the
  // marker in time.
  const offNavigated = onSignal("page:navigated", () => {
    traversedOnce = true;
  });
  const offReturned = onSignal("page:returned", () => {
    traversedOnce = true;
  });
  return () => {
    offAnchor();
    offRemember();
    offNavigated();
    offReturned();
  };
}

/** How THIS document arrived, per the Navigation Timing API: "navigate"
 * (a fresh entry — nothing of ours can live in its state), "reload"
 * (the entry's state survives the reload) and "back_forward" (the
 * returned-to entry's state carries whatever it left with). NOTE: a
 * same-document SPA traversal (the router's back onto the home page)
 * keeps the ORIGINAL load's type — "navigate" — so a bookmark read back
 * in that state is still ours-in-this-document, not a fresh arrival.
 * See windowBookmark: the key's presence is the only gate it needs. */
export const navigationType = (): "navigate" | "reload" | "back_forward" => {
  const entry = performance.getEntriesByType?.("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  return entry?.type ?? "navigate";
};

/** The window the CURRENT entry is bookmarked to, or null. NO timing
 * gate: the bookmark key is written by this module alone, merged into
 * the entry the writer stood on — either within this very document (an
 * internal link's bookmark, read back by the SAME document when the
 * browser back remounts the page) or across one (the off-site
 * departure, read back by a back_forward/reload arrival). A fresh
 * cross-document navigation ("navigate" type) starts on a NEW entry
 * whose state is null — it can never carry this key by accident, so
 * the key's presence is already proof the entry is one of ours. The
 * earlier timing gate actively BROKE the internal round trip: the SPA
 * back shares the original load's "navigate" timing entry, so the
 * bookmark written seconds before was refused on return. Gating on
 * presence is exact. */
export function windowBookmark(): string | null {
  const id = (history.state as EntryState | null)?.window;
  return typeof id === "string" && id ? id : null;
}

/** Whether a traversal ALREADY happened in THIS document. Any in-document
 * page commit (the pageSlide theme announces every SPA push and every
 * history traversal on the bus — see attachHistoryBookmarks) sets this.
 * Module scope: a fresh document load starts false. Once set, this
 * document is a browsing session — a hyperlink landing on a section URL
 * must be the INLINE reveal it always was, never the maximized permalink
 * page (a permalink page is only for genuinely fresh arrivals). */
let traversedOnce = false;

/** Whether THIS document followed a same-site hyperlink in: an in-site
 * raw anchor's cross-document arrival carries a same-origin referrer
 * (full document loads bypass every SPA hook, so the click is invisible
 * to the app). That click IS the traversal into the section, not a
 * fresh permalink — the landing is inline. Typed URLs, out-of-site
 * shared links and the Permalink button (window.open ... noreferrer)
 * arrive REFERRER-LESS; the maximized landing stays theirs. */
const inSiteLinkArrival = (): boolean => {
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
};

/** Whether THIS document arrived FRESH — typed, shared, or opened by a
 * permalink button in a new tab: the "navigate" timing type, an entry
 * that carries none of our window state, no earlier in-document
 * traversal (traversedOnce) and no same-site referrer
 * (inSiteLinkArrival). A same-document SPA traversal shares the
 * original load's "navigate" type, and an in-site hyperlink's
 * cross-document load shares the same shape — BOTH are traversals, and
 * both land on the inline reveal they always had. The maximized
 * permalink landing is only for genuinely fresh arrivals: returns never
 * re-maximize, and a hyperlink NEVER lifts the section out of the page
 * it was read on. */
export function freshArrival(): boolean {
  return (
    navigationType() === "navigate" &&
    windowBookmark() === null &&
    !traversedOnce &&
    !inSiteLinkArrival()
  );
}
