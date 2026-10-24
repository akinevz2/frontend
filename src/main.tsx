import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "xp.css/dist/98.css";
import "react-toastify/dist/ReactToastify.css";
import "./styles/index.css";
import { App } from "./shell/App";
import { SignalProvider } from "./lib/signals";
import { attachRouterSignals } from "./shell/routerSignals";
import { enablePageSlide } from "./themes/pageSlide";

document.body.classList.add("styles-loaded");
// Attach the shell's signal handlers at boot, next to the theme: the
// bus carries navigation commands, route-change notices and window
// events; handlers live here and in lib modules, not in components.
attachRouterSignals();
// Always install the page-slide theme: its hooks drive window
// minimisation, navigation choreography and sounds. When the page is
// loaded directly ONTO a hyperlinked window target (a #hash or ?post=
// slug the route reveals), the theme starts "parked" — zero slide
// distance — so the entrance plays from nowhere and disturbs nothing
// before the reveal scrolls to the linked section. Page loads without a
// hyperlink target slide in from the top as usual; later navigations
// apply a real direction and slide as usual.
enablePageSlide();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SignalProvider>
        <App />
      </SignalProvider>
    </BrowserRouter>
  </StrictMode>,
);
