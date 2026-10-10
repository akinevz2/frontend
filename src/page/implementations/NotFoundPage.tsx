import type { PageComponent } from "..";
import type { PageContent } from "@/content/types";
import { PurePage } from "@/page/components/PurePage";

export const NotFoundPage: PageComponent = () => {
  const errorContent: PageContent = {
    heading: "Page Not Found",
    className: "error-window",
    theme: "open",
    content: [
      {
        heading: "Error Message",
        content: [
          `<pre class="error-stack">404 - Not Found</pre>`,
          "The page you are looking for does not exist.",
        ],
        theme: "open",
      },
    ],
  };
  return <PurePage json={errorContent} />;
};
