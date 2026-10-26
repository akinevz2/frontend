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
