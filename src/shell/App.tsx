import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { pageRegistry } from "@/pages";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { applyStoredTheme } from "@/lib/theme";
import { bindNavigate } from "./routerSignals";
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
  const navigate = useNavigate();
  // The shell keeps only the router awareness: the app:navigate handler
  // attached at boot (routerSignals) performs dispatches with THIS
  // navigate, bound here against the router context. Page-load
  // monitoring is the attached handlers' business too — the boot route
  // is announced there, transitions by the pageSlide theme.
  bindNavigate(navigate);

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
