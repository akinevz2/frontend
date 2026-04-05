import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import "./styles/main.css";
import App from "./App";

const checkStylesLoaded = () => {
  const themeCssLink = document.getElementById("theme-css") as
    | HTMLLinkElement
    | null;
  if (themeCssLink?.sheet) {
    document.body.classList.add("styles-loaded");
    return true;
  }
  return false;
};

if (!checkStylesLoaded()) {
  const themeCssLink = document.getElementById("theme-css");
  themeCssLink?.addEventListener("load", () => {
    document.body.classList.add("styles-loaded");
  });

  window.setTimeout(() => {
    if (!document.body.classList.contains("styles-loaded")) {
      document.body.classList.add("styles-loaded");
    }
  }, 100);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);