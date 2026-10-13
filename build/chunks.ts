/** Vendor chunk grouping, first match wins (order matters: react-* before react). */
const GROUPS: Array<[chunk: string, needles: string[]]> = [
  ["firebase", ["firebase"]],
  ["markdown", ["react-markdown", "rehype", "remark", "unified", "mdast", "hast", "micromark"]],
  ["toastify", ["react-toastify"]],
  ["react-core", ["react", "scheduler"]],
  ["xpcss", ["xp.css"]],
];

export function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  for (const [chunk, needles] of GROUPS) {
    if (needles.some((n) => id.includes(n))) return chunk;
  }
  return "vendor";
}
