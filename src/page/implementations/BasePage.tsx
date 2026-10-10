import type { PageComponent } from "..";
import { loadPageContent } from "../content";
import { PurePage } from "../components/PurePage";
import type { PageProps } from "../types";

export const BasePage: PageComponent = ({ current }: PageProps) => {
  const content = loadPageContent(current.content);
  return <PurePage json={content} />;
};
