import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { pageRegistry } from "@/pages";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { createPageSlide } from "@page-slide";
import { usePageSlide } from "@page-slide/react";
import { applyStoredTheme } from "@/lib/theme";
import { Clippy } from "./Clippy";
import { MenuBar } from "./MenuBar";
import { visibleMenuItems } from "./menu";
import { resolveRoute } from "./resolveRoute";
import { useRouteMeta } from "./useRouteMeta";

const pageSlide = createPageSlide();

/** Hidden page: / with this hash is an empty yellow screen. */
const FEEF69_HASH = "#feef69";

export function App() {
  const { pathname, hash } = useLocation();
  const route = resolveRoute(pathname);
  const Page = pageRegistry[route.page] ?? NotFoundPage;

  const blank = pathname === "/" && hash.toLowerCase() === FEEF69_HASH;

  useRouteMeta(route);
  useEffect(() => {
    document.body.classList.toggle("feef69-page", blank);
    return () => document.body.classList.remove("feef69-page");
  }, [blank]);
  useEffect(applyStoredTheme, []);
  useEffect(() => {
    pageSlide.enable();
    return () => pageSlide.disable();
  }, []);
  usePageSlide(
    pageSlide,
    pathname,
    visibleMenuItems(pathname, false).map((item) => item.href),
  );

  if (blank) return <main className="feef69-page" />;

  return (
    <>
      <MenuBar />
      <main>
        <section className="page" key={route.path}>
          <Page />
        </section>
      </main>
      <Clippy />
      <ToastContainer position="bottom-right" />
    </>
  );
}
