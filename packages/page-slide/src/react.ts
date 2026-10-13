import { useLayoutEffect, useRef } from "react";
import type { PageSlide } from "./pageSlide";

/**
 * Optional React adapter: tells the slide controller about each navigation.
 * `key` identifies the current page (e.g. pathname); `order` is the menu order.
 */
export function usePageSlide(
  slide: PageSlide,
  key: string,
  order: readonly string[],
): void {
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = key;
    if (from !== null && from !== key) slide.navigate(from, key, order);
    // order is read at navigation time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, key]);
}
