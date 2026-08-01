import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "xp.css/dist/98.css";
import "./styles.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);