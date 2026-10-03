import {
  useLocation,
  type ReactNode,
} from "react-router-dom";
import {
  PageSpace,
  type PageProps,
} from "./components/PageSpace";
import {
  MenuBar,
  type MenuBarProps,
} from "./components/MenuBar";
import {
  ErrorProvider,
  ErrorDisplay,
  type ErrorProviderProps,
  type ErrorDisplayProps,
} from "./providers";
import {
  ErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorBoundaryState,
} from "./components/ErrorBoundary";
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
    <>
      <PageSpace page={currentPath}>
        <MenuBar />
      </PageSpace>
    </>
  );
}
