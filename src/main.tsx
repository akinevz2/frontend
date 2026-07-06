import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import "xp.css/dist/98.css";
import "./styles/main.css";
import App from "./App";

document.body.classList.add("styles-loaded");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
