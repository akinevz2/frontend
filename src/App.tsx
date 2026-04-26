import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { ToastContainer } from "react-toastify";

import MenuBar from "./components/MenuBar";
import BlogContent from "./components/BlogContent";
import MusicContent from "./components/MusicContent";
import { PageContent, PageWithAddons } from "./components/Page";
import sections from "./sections.json";
import contacts from "./contacts.json";
import addons from "./addons.json";
import pages from "./pages.json";
import type { SectionProps } from "./windowing";
import type { AddonProps } from "./components/Addon";
import { processContent } from "./windowing/utils";

type RouteConfig = {
  title: string;
  description: string;
};

type PageRoute = RouteConfig & {
  path: string;
};

const DEFAULT_ROUTE: RouteConfig = {
  title: "home of kine",
  description: "my cozy little personal website",
};

const PAGE_ROUTES = pages as PageRoute[];

const TOP_LEVEL_ROUTES = new Set(
  PAGE_ROUTES.map(({ path }) => path.split("/").filter(Boolean)[0]).filter(
    Boolean,
  ),
);

const ROUTE_CONFIG = Object.fromEntries(
  PAGE_ROUTES.map(({ path, title, description }) => [
    path,
    { title, description },
  ]),
) as Record<string, RouteConfig>;

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/";
  }

  const decodedPath = decodeURIComponent(path);
  const withoutIndexHtml = decodedPath.replace(/\/index\.html$/i, "/");
  const withoutHtml = withoutIndexHtml.replace(/\.html$/i, "");
  const withoutTrailingSlash = withoutHtml.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  const [firstSegment] = segments;

  if (TOP_LEVEL_ROUTES.has(firstSegment.toLowerCase())) {
    return `/${firstSegment.toLowerCase()}`;
  }

  return withoutTrailingSlash || "/";
};

const isInternalPath = (href: string) => href.startsWith("/");

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element?.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  if ("content" in attributes) {
    element.setAttribute("content", attributes.content);
  }
};

const upsertCanonicalLink = (href: string) => {
  let canonical = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", href);
};

const HomePage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(sections as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent
        sections={processed as SectionProps}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

const AddonsPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(addons as AddonProps),
    [],
  );

  return (
    <main>
      <PageWithAddons
        addons={processed as AddonProps}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

const ContactPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(contacts as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent
        sections={processed as SectionProps}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

const ResumePage = () => {
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  return (
    <main>
      <section className="page">
        <div className="window">
          <div className="title-bar">
            <div className="title-bar-text">Resume</div>
            <div className="title-bar-controls">
              <button aria-label="Minimize"></button>
              <button aria-label="Maximize"></button>
              <button aria-label="Close"></button>
            </div>
          </div>
          <div
            className="window-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
              padding: "2rem",
            }}
          >
            <button onClick={() => setShowResumeModal(true)}>
              View My Resume
            </button>
            <button onClick={() => setShowEmailModal(true)}>
              Contact Emails
            </button>
          </div>
        </div>
      </section>

      {showResumeModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowResumeModal(false);
            }
          }}
        >
          <div
            className="window"
            style={{ width: "90vw", height: "90vh", maxWidth: "1200px" }}
          >
            <div className="title-bar">
              <div className="title-bar-text">Resume</div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowResumeModal(false)}
                ></button>
              </div>
            </div>
            <div
              className="window-body"
              style={{
                padding: 0,
                height: "calc(100% - 2rem)",
                overflow: "hidden",
              }}
            >
              <iframe
                src="/resume.html"
                title="Resume"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showEmailModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowEmailModal(false);
            }
          }}
        >
          <div className="window" style={{ maxWidth: "400px", margin: "auto" }}>
            <div className="title-bar">
              <div className="title-bar-text">Contact Emails</div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowEmailModal(false)}
                ></button>
              </div>
            </div>
            <div className="window-body">
              <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0" }}>
                <li style={{ margin: "0.5rem 0" }}>
                  <a href="mailto:akinevz@outlook.com">akinevz@outlook.com</a>
                </li>
                <li style={{ margin: "0.5rem 0" }}>
                  <a href="mailto:akinevz@gmail.com">akinevz@gmail.com</a>
                </li>
              </ul>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button onClick={() => setShowEmailModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

const WowPage = () => {
  const [username, setUsername] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!username.trim()) {
      setMessageType("error");
      setMessage("Please enter a username.");
      return;
    }

    if (!date) {
      setMessageType("error");
      setMessage("Please enter a date.");
      return;
    }

    if (username.trim().toLowerCase() !== "kine") {
      setMessageType("error");
      setMessage("Invalid username.");
      return;
    }

    if (date !== today) {
      setMessageType("error");
      setMessage("Incorrect date. Please enter today's date.");
      return;
    }

    setMessageType("success");
    setMessage("Date verified! Starting download...");

    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = "/WoW_Config.zip";
      link.download = "WoW_Config.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessageType("success");
      setMessage("Download started successfully!");
    }, 500);
  };

  return (
    <main>
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem" }}>
        <div
          className="window"
          style={{ background: "#ece9d8", border: "2px outset #dfdfdf" }}
        >
          <div className="title-bar">
            <span className="title-bar-text">WoW Configuration Download</span>
          </div>

          <div style={{ marginBottom: "1rem", lineHeight: 1.5 }}>
            <p>
              To download the World of Warcraft configuration files, please
              enter your username and verify today's date.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="usernameInput"
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                Username:
              </label>
              <input
                id="usernameInput"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                required
                style={{
                  width: "300px",
                  padding: "0.5rem",
                  border: "2px inset #808080",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="dateInput"
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                Enter today's date:
              </label>
              <input
                id="dateInput"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                max={today}
                required
                style={{
                  width: "300px",
                  padding: "0.5rem",
                  border: "2px inset #808080",
                }}
              />
            </div>

            <button
              type="submit"
              style={{ padding: "0.5rem 1.5rem", marginRight: "0.5rem" }}
            >
              Verify & Download
            </button>
            <button
              type="button"
              style={{ padding: "0.5rem 1.5rem" }}
              onClick={() => {
                window.history.pushState({}, "", "/");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              Cancel
            </button>

            {message ? (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontWeight: "bold",
                  color: messageType === "error" ? "#c00" : "#080",
                }}
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  );
};

const NotFoundPage = () => (
  <main>
    <section className="page">
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">Not Found</div>
        </div>
        <div className="window-body">
          <p>That page does not exist.</p>
          <a href="/">Go home</a>
        </div>
      </div>
    </section>
  </main>
);

export default function App() {
  const [path, setPath] = useState(() =>
    normalizePath(window.location.pathname),
  );

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const route = ROUTE_CONFIG[path] ?? DEFAULT_ROUTE;

  useEffect(() => {
    document.title = route.title;

    const canonicalUrl = new URL(path, window.location.origin).toString();
    const socialImageUrl = new URL(
      "/avatar.png",
      window.location.origin,
    ).toString();

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: route.description,
    });
    upsertCanonicalLink(canonicalUrl);

    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: route.title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: route.description,
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: socialImageUrl,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary",
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: socialImageUrl,
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: route.title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: route.description,
    });
  }, [path, route.title, route.description]);

  const navigate = (href: string) => {
    if (!isInternalPath(href)) {
      window.location.assign(href);
      return;
    }

    const current = normalizePath(window.location.pathname);
    const next = normalizePath(href);

    if (current === next && window.location.search === "") {
      return;
    }

    window.history.pushState({}, "", href);
    setPath(next);
  };

  let content: ReactElement;
  switch (path) {
    case "/":
      content = <HomePage />;
      break;
    case "/addons":
      content = <AddonsPage />;
      break;
    case "/blog":
      content = (
        <main>
          <BlogContent />
        </main>
      );
      break;
    case "/music":
      content = (
        <main>
          <MusicContent />
        </main>
      );
      break;
    case "/contact":
      content = <ContactPage />;
      break;
    case "/resume":
      content = <ResumePage />;
      break;
    case "/wow":
      content = <WowPage />;
      break;
    default:
      content = <NotFoundPage />;
      break;
  }

  return (
    <>
      <MenuBar onNavigate={navigate} />
      {content}
      <ToastContainer />
    </>
  );
}
