import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "xp.css/dist/98.css";
import "react-toastify/dist/ReactToastify.css";
import "./styles/index.css";
import { App } from "./shell/App";

document.body.classList.add("styles-loaded");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
