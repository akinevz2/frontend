import { LinkProvider } from './components/Router';
import { useEffect, useRef } from 'react';
import { PageSpace } from './components/PageSpace';
import { useLocation } from 'react-router-dom';

export default function Website() {
  const location = useLocation();
  
  // Get current path
  const currentPath = location.pathname;

  return (
    <LinkProvider>
      <PageSpace page={currentPath} />
    </LinkProvider>
  );
}