import type { Content } from "@/content/types";

const contentModules = import.meta.glob("../content/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Content>;

const contentModuleKeys = new Map(
  Object.keys(contentModules).map((modulePath) => [
    modulePath.replace(/^\.\.\/content\//, "/content/"),
    modulePath,
  ]),
);

export function hasContentFile(path: string): boolean {
  return contentModuleKeys.has(path);
}

export function loadPageContent(path: string | undefined): Content {
  if (!path) {
    throw new Error("BasePage requires a content path");
  }
  if (!path.startsWith("/content/")) {
    throw new Error(`invalid page content path: ${path}`);
  }

  const modulePath = contentModuleKeys.get(path);
  if (!modulePath) {
    throw new Error(`page content file not found: ${path}`);
  }

  return contentModules[modulePath];
}
