import { learningLandingSection, type Section } from "@/content";
import { PageWindows } from "@/window";

/** The /learning landing — a clearly marked STUB (docs/LEARNING_PLAN.md
 * §8 Phase 2): the route exists and links the lessons with ordinary
 * inline hyperlinks; the lesson list is generated from the tree walk
 * (src/content/learningTree.ts), never hand-maintained. */
export const LearningPage = () => {
  const content: Section = learningLandingSection();
  return <PageWindows content={content} />;
};
