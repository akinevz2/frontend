import { PurePage } from "../components/PurePage";
import type { PageComponent } from "../types";

const RANDOM_POST_PATH = /^\/blog\/random\/([A-Za-z0-9._-]+)\.md$/;

export function randomPostPath(pathname: string): string | null {
  const match = pathname.match(RANDOM_POST_PATH);
  return match ? `/blog/random/${match[1]}.md` : null;
}

export const RandomPostsPage: PageComponent = ({ current }) => {
  const { path } = current;
  return (
    <PurePage
      json={{
        heading: "A Pure Random Post Page",
        content: ["Test content", path, "Test"],
      }}
    />
  );
};
