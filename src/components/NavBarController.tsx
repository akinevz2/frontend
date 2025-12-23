import { useIsNavBarVisible } from "./SectionContext";
import { useState, useEffect } from "react";

export const NavBarController = () => {
  const isVisible = useIsNavBarVisible();
  const [shouldShow, setShouldShow] = useState(false);
  const [isHomePage, setIsHomePage] = useState(false);

  useEffect(() => {
    // Check if we're on the home page
    const isHome =
      window.location.pathname === "/" ||
      window.location.pathname === "/index.html";
    setIsHomePage(isHome);

    // If not home page, always show navbar
    if (!isHome) {
      setShouldShow(true);
    }
  }, []);

  useEffect(() => {
    // On home page, only show if section has been expanded
    if (isHomePage && isVisible && !shouldShow) {
      setShouldShow(true);
    }
  }, [isVisible, shouldShow, isHomePage]);

  useEffect(() => {
    const navbar = document.querySelector("nav");
    const body = document.body;

    if (navbar && body) {
      // Add transition for smooth animation
      navbar.style.transition = "bottom 0.4s ease-out, opacity 0.4s ease-out";

      if (shouldShow) {
        navbar.style.opacity = "1";
        body.classList.add("nav-visible");

        // Position at bottom on non-home pages
        if (!isHomePage) {
          navbar.style.position = "absolute";
          navbar.style.top = "auto";
          navbar.style.left = "50%";
          navbar.style.transform = "translateX(-50%)";
          navbar.style.bottom = "10px";
          navbar.style.marginTop = "0";
        } else {
          navbar.style.transform = "translateY(0)";
        }
      } else {
        navbar.style.opacity = "0";
        // Position below viewport on non-home pages, above viewport on home page
        if (!isHomePage) {
          navbar.style.position = "absolute";
          navbar.style.top = "auto";
          navbar.style.left = "50%";
          navbar.style.transform = "translateX(-50%)";
          // Push completely off page
          navbar.style.bottom = "-200px";
        } else {
          navbar.style.transform = "translateY(-100%)";
        }
        body.classList.remove("nav-visible");
      }
    }
  }, [shouldShow, isHomePage]);

  return null;
};
