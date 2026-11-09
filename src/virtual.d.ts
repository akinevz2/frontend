/** The blog directory listing is served by build/blogDirsPlugin.ts as a
 * virtual module: a live walk of public/blog/'s subdirectories. There is
 * no snapshot file — the filesystem is the only source (recomputed on
 * dev-server watch changes and at every build). */
declare module "virtual:blog-dirs" {
  const blogDirs: {
    directories: Array<{
      path: string;
      files: string[];
      dirs: string[];
    }>;
  };
  export default blogDirs;
}

/** The project-file mtimes are served by build/projectMtimesPlugin.ts as
 * a virtual module: a live walk of src/content/projects/*.json's mtimes.
 * There is no snapshot file — the filesystem is the only source
 * (recomputed on dev-server watch changes and at every build). */
declare module "virtual:project-mtimes" {
  /** file name → mtime (epoch ms) */
  const projectMtimes: Record<string, number>;
  export default projectMtimes;
}

/** The content-file include targets are served by
 * build/includesPlugin.ts as a virtual module: a live walk of
 * public/includes/ and public/blog/releases/ keyed by public path.
 * There is no snapshot file — the filesystem is the only source
 * (recomputed on dev-server watch changes and at every build). */
declare module "virtual:content-includes" {
  /** public path → raw file text */
  const contentIncludes: Record<
    string,
    { kind: "json" | "md"; content: string }
  >;
  export default contentIncludes;
}
