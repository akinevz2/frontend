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

/** The learning tree listing is served by build/blogDirsPlugin.ts (the
 * same plugin) as a virtual module: a live walk of public/learning/'s
 * directories. No snapshot file — the filesystem is the only source. */
declare module "virtual:learning-tree" {
  const learningTree: {
    directories: Array<{
      path: string;
      files: string[];
      dirs: string[];
    }>;
  };
  export default learningTree;
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

/** The include targets are served by build/contentTargetsPlugin.ts as a
 * virtual module: the reference-driven closure of the directive strings
 * found in the content files (the .json files under src/content), keyed
 * by public path. There is no directory list and no snapshot file — the
 * directives are the only registration; a dangling path fails the
 * build. */
declare module "virtual:content-targets" {
  /** public path → raw file text */
  const contentTargets: Record<
    string,
    { kind: "json" | "md"; content: string }
  >;
  export default contentTargets;
}
