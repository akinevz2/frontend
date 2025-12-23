import { SectionProvider } from "./SectionContext";
import { NavBarController } from "./NavBarController";

export const NavBarControllerWrapper = () => {
  return (
    <SectionProvider>
      <NavBarController />
    </SectionProvider>
  );
};
