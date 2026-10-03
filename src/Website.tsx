import { useLocation } from "react-router-dom";
import { PageSpace } from "./components/PageSpace";
import { MenuBar } from "./components/MenuBar";
import { ErrorProvider } from "./providers";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./components/Error.css";
import type { PageRoute } from "./pages/usePageRouting";

import "xp.css/dist/98.css";

interface WebsiteProps {
  pagesRoutes: PageRoute[];
}

export default function Website({ pagesRoutes }: WebsiteProps) {
  const location = useLocation();

  const currentPath = location.pathname;

  const currentRoute = pagesRoutes.find((route) => route.path === currentPath);

  if (!currentRoute) {
    return null;
  }

  return (
    <ErrorProvider setError={(error) => console.error("Website error:", error)}>
      <ErrorBoundary>
        <PageSpace page={currentPath}>
          <MenuBar />
        </PageSpace>
      </ErrorBoundary>
    </ErrorProvider>
  );
}
