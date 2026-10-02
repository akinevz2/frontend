import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Website from "./Website";
import Router from "./components/Router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
    <Website />
  </StrictMode>,
);