import { SectionProvider } from "../windowing";
import { NavBarController } from "./NavBarController";

export const NavBarControllerWrapper = () => {
  // Create empty metadata for navbar context
  const pageMetadata = { sections: new Map() };
  
  return (
    <SectionProvider pageMetadata={pageMetadata}>
      <NavBarController />
    </SectionProvider>
  );
};
