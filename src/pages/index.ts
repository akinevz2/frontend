import type { ComponentType } from "react";
import { AddonsPage } from "./AddonsPage";
import { BlogDirPage } from "./BlogDirPage";
import { BlogPage } from "./BlogPage";
import { BlogPostPage } from "./BlogPostPage";
import { ContactPage } from "./ContactPage";
import { ConfigsPage } from "./ConfigsPage";
import { HomePage } from "./HomePage";
import { MusicPage } from "./MusicPage";
import { NotFoundPage } from "./NotFoundPage";
import { ProjectPage } from "./ProjectPage";
import { ProjectsPage } from "./ProjectsPage";
import { ResumePage } from "./ResumePage";
import { SitemapPage } from "./SitemapPage";
import { WowPage } from "./WowPage";

/** Maps the `page` names in content/pages.json to components. */
export const pageRegistry: Record<string, ComponentType> = {
  AddonsPage,
  BlogDirPage,
  BlogPage,
  BlogPostPage,
  ConfigsPage,
  ContactPage,
  HomePage,
  MusicPage,
  NotFoundPage,
  ProjectPage,
  ProjectsPage,
  ResumePage,
  SitemapPage,
  WowPage,
};
