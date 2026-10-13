import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { pageRegistry } from "@/pages";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { applyStoredTheme } from "@/lib/theme";
import { Clippy } from "./Clippy";
import { MenuBar } from "./MenuBar";
import { resolveRoute } from "./resolveRoute";
import { useRouteMeta } from "./useRouteMeta";

export function App() {
  const { pathname } = useLocation();
  const route = resolveRoute(pathname);
  const Page = pageRegistry[route.page] ?? NotFoundPage;

  useRouteMeta(route);
  useEffect(applyStoredTheme, []);

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
