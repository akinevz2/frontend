import type { Route, Section, SoundCloudData } from "./schema";
import pagesJson from "./pages.json";
import sectionsJson from "./sections.json";
import contactsJson from "./contacts.json";
import addonsJson from "./addons.json";
import charactersJson from "./characters.json";
import pagertsJson from "./pagerts.json";
import blogJson from "./blog.json";
import soundcloudJson from "./soundcloud.json";
import musicExtJson from "./music-ext.json";

export * from "./schema";

export const routes = pagesJson as Route[];
export const sections = sectionsJson as Section;
export const contacts = contactsJson as Section;
export const addons = addonsJson as Section;
export const characters = charactersJson as Section;
export const pagerts = pagertsJson as Section;
export const blog = blogJson as Section;
export const soundcloud = soundcloudJson as SoundCloudData;
export const musicExt = musicExtJson;
