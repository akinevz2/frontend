import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Website from "./Website";
import { ErrorBoundary, ErrorProvider } from "./page/components/error";


function main() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Website />
          </BrowserRouter>
        </ErrorBoundary>
      </ErrorProvider>
    </StrictMode>,
  );
}

main();
