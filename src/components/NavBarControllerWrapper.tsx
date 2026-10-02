import { SectionProvider } from "../providers";
import { NavBarController } from "./NavBarController";

export const NavBarControllerWrapper = () => {
  // Create minimal metadata for navbar context - this is just a placeholder
  // since nav bar doesn't actually need full section state management
  const pageMetadata = {
    expandedSections: new Set(),
    minimizedSections: new Set(),
    maximizedWindows: new Set(),
  } as any;

  return (
    <SectionProvider pageMetadata={pageMetadata}>
      <NavBarController />
    </SectionProvider>
  );
};
