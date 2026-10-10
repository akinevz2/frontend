import { MenuBar } from "./page/components/menu/MenuBar";

import "xp.css/dist/98.css";
import "@/main.css";
import { PageProvider } from "./page";
import { useLocation } from "react-router-dom";
import { pages } from "./page";

export default function Website() {
  const location = useLocation();

  return (
    <PageProvider pages={pages}>
      <MenuBar location={location} />
    </PageProvider>
  );
}
