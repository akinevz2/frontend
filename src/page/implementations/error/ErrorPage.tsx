import type { PageContent } from "@/content/types";
import { PurePage } from "@/page/components/PurePage";

interface ErrorPageProps {
  error: Error;
  title?: string;
}

export function ErrorPage({ error, title = "Error" }: ErrorPageProps) {
  const errorContent: PageContent = {
    heading: title,
    className: "error-window",
    theme: "open",
    content: [
      {
        heading: "Error Message",
        content: error.message,
        theme: "open",
      },
      {
        heading: "Stack Trace",
        content: `<pre class="error-stack">${error.stack}</pre>`,
        theme: "open",
      },
    ],
  };
  return <PurePage json={errorContent} />;
}
