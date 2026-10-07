import { MenuBar } from "./page/components/menu/MenuBar";

import "xp.css/dist/98.css";
import { ErrorBoundary, ErrorProvider } from "./page/components/error";
import { PageProvider } from "./page";
import { useLocation } from "react-router-dom";
import { usePages } from "./page/hooks";
import { PageSpace } from "./page/components/PurePage";

export default function Website() {
  const location = useLocation();
  const pages = usePages();

  return (
    <ErrorProvider>
      <ErrorBoundary>
        <PageProvider pages={pages}>
          <MenuBar location={location} />
          <PageSpace location={location} />
        </PageProvider>
      </ErrorBoundary>
    </ErrorProvider>
  );
}
