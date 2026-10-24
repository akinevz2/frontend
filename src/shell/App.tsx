import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { pageRegistry } from "@/pages";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { applyStoredTheme } from "@/lib/theme";
import { useSignal, useSignals } from "@/lib/signals";
import { Clippy } from "./Clippy";
import { MenuBar } from "./MenuBar";
import { resolveRoute } from "./resolveRoute";
import { useRouteMeta } from "./useRouteMeta";

/** Hidden page: / with this hash is an empty yellow screen. */
const FEEF69_HASH = "#feef69";

export function App() {
  const { pathname, hash } = useLocation();
  const route = resolveRoute(pathname);
  const Page = pageRegistry[route.page] ?? NotFoundPage;
  const { dispatch } = useSignals();
  const navigate = useNavigate();

  // The navigation behaviour is a signal handler: any module dispatches
  // "app:navigate" and the shell — the router-aware behaviour — performs
  // the route change. The pageSlide choreography rides the pushState it
  // triggers, exactly as a direct navigate() would.
  useSignal("app:navigate", ({ to }) => navigate(to));

  // Page-load monitoring: every mounted route announces itself, initial
  // load included (pages remount per route path).
  useEffect(() => {
    dispatch("page:loaded", { path: pathname });
  }, [pathname, dispatch]);

  const blank = pathname === "/" && hash.toLowerCase() === FEEF69_HASH;

  useRouteMeta(route);
  useEffect(() => {
    document.body.classList.toggle("feef69-page", blank);
    return () => document.body.classList.remove("feef69-page");
  }, [blank]);
  useEffect(applyStoredTheme, []);

  if (blank) return <main className="feef69-page" />;

  // Aliased short-hands redirect (e.g. /addons -> /wow#addons).
  if (route.alias) return <Navigate to={route.alias} replace />;

  return (
    <>
      <MenuBar />
      <main>
        <section
          className={`page${route.path === "/configs" ? " page-configs" : ""}`}
          key={route.path}
        >
          <Page />
        </section>
      </main>
      <Clippy />
      <ToastContainer position="bottom-right" />
    </>
  );
}
