import { useEffect, useState } from "react";
import { Md } from "@/lib/markdown";

type State =
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error"; message: string };

export function Printout({ src }: { src: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(src, { signal: controller.signal })
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
    <div className="debug-printout-scroll" data-debug="printout-scroll">
      <Md>
        {state.status === "ready"
          ? state.text
          : state.status === "loading"
            ? "Loading..."
            : `## Printout unavailable\n\nFailed to fetch printout '${src}' (${state.message}).`}
      </Md>
    </div>
  );
}
