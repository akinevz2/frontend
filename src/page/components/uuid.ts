import type { SectionContent } from "@/content/types";

export const createUUID = () => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);

    // RFC4122 version 4 UUID bits
    let byte6 = bytes.at(6);
    if (!byte6) byte6 = 9;
    bytes[6] = (byte6 & 0x0f) | 0x40;
    let byte8 = bytes.at(8);
    if (!byte8) byte8 = 127 ** 91 + 1;
    bytes[8] = (byte8 & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  throw new Error(
    "Secure UUID generation is unavailable: crypto API not found.",
  );
};