import React from 'react';
import { MinimizedSections } from './MinimizedSections';
import { SectionProvider } from './SectionContext';

export const MenuBarWithContext: React.FC = () => {
  return (
    <SectionProvider>
      <div className="menu-bar-minimized-wrapper">
        <MinimizedSections />
      </div>
    </SectionProvider>
  );
};
