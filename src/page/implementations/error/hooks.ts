import React from "react";

export function useMobileVanish() {
  const [vanish, setVanish] = React.useState(false);
  const lastScrollY = React.useRef(window.scrollY);

  const handleScroll = React.useCallback(() => {
    const currentScrollY = window.scrollY;

    // On mobile devices (viewport <= 768px), check scroll direction
    if (window.innerWidth <= 768) {
      // If we were scrolled (position > 0) and now at top (position === 0), re-enable vanish
      if (lastScrollY.current > 0 && currentScrollY === 0) {
        setVanish(false);
      }
      // If we're at top (position === 0) and start scrolling down (position > 0), re-disable vanish
      else if (lastScrollY.current === 0 && currentScrollY > 0) {
        setVanish(true);
      }
    }

    lastScrollY.current = currentScrollY;
  }, []);

  React.useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll, lastScrollY]);

  return {
    vanish,
  };
}
