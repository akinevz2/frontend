import { useEffect, useState } from "react";
import { Md } from "@/lib/markdown";

const rawUrl = (src: string) =>
  /^\/blog\/.+\.md$/i.test(src) ? `/raw${src}` : src;

type State =
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error"; message: string };

export function ResourceEmbed({ src }: { src: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(rawUrl(src), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => setState({ status: "ready", text }))
      .catch((error: Error) => {
        if (error.name !== "AbortError")
          setState({ status: "error", message: error.message });
      });
    return () => controller.abort();
  }, [src]);

  return (
    <div className="resource-embed-scroll" data-debug="resource-embed-scroll">
      <Md>
        {state.status === "ready"
          ? state.text
          : state.status === "loading"
            ? "Loading..."
            : `## Resource unavailable\n\nFailed to fetch embed '${src}' (${state.message}).`}
      </Md>
    </div>
  );
}
