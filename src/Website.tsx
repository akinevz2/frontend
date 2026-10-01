import { usePages } from "./hooks/usePages";
import { useRouting } from "./routing/routingReducer";

const DEFAULT_ROUTE: RouteConfig = {
  title: "home of kine",
  description: "my cozy little personal website",
};

// This will be populated from pages.json, but for now we'll keep this structure
const PAGE_ROUTES: PageRoute[] = [];

const TOP_LEVEL_ROUTES = new Set(
  PAGE_ROUTES.map(({ path }) => path.split("/").filter(Boolean)[0]).filter(
    Boolean,
  ),
);

const ROUTE_CONFIG: Record<string, RouteConfig> = {};

export default function Website() {
  // FIXME: don't like that a useRouting hook is configured with local methods
  // and it is only used to produce a path variable

  // CHANGEME: create a
  const {
    state: { path },
  } = useRouting();

  const {
    pages
  } = usePages();

  // FIXME: codesmell
  // const route = ROUTE_CONFIG[path] ?? DEFAULT_ROUTE;

  // Route rendering logic - extracted from App.tsx
  // All the page-specific logic from the original App.tsx
  return null;
  // return (
  //   <>
  //     {path === "/blog" ? (
  //       <main>
  //         <div className="blog-content">
  //           {/* Blog content would be rendered here */}
  //           <h1>Blog Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/music" ? (
  //       <main>
  //         <div className="music-content">
  //           {/* Music content would be rendered here */}
  //           <h1>Music Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/sitemap" ? (
  //       <main>
  //         <div className="sitemap-content">
  //           {/* Sitemap content would be rendered here */}
  //           <h1>Sitemap Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/contact" ? (
  //       <main>
  //         <div className="contact-content">
  //           {/* Contact content would be rendered here */}
  //           <h1>Contact Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/resume" ? (
  //       <main>
  //         <div className="resume-content">
  //           {/* Resume content would be rendered here */}
  //           <h1>Resume Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/wow" ? (
  //       <main>
  //         <div className="wow-content">
  //           {/* WoW content would be rendered here */}
  //           <h1>WoW Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/pagerts" ? (
  //       <main>
  //         <div className="pagerts-content">
  //           {/* Pagerts content would be rendered here */}
  //           <h1>Pagerts Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/addons" ? (
  //       <main>
  //         <div className="addons-content">
  //           {/* Addons content would be rendered here */}
  //           <h1>Addons Content</h1>
  //         </div>
  //       </main>
  //     ) : path === "/" ? (
  //       <main>
  //         <div className="home-content">
  //           {/* Home content would be rendered here */}
  //           <h1>Home Content</h1>
  //         </div>
  //       </main>
  //     ) : (
  //       /* Default 404 page */
  //       <main>
  //         <div className="not-found-content">
  //           <h1>Page Not Found</h1>
  //           <p>The requested page could not be found.</p>
  //         </div>
  //       </main>
  //     )}
  //   </>
  // );
}
