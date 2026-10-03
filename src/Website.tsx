import { MenuBar } from "./page/components/menu/MenuBar";

import "xp.css/dist/98.css";
import { usePages } from "./page/hooks";

export default function Website() {
  const pages = usePages();
  return (
    <MenuBar pages={pages} />
  );
}
