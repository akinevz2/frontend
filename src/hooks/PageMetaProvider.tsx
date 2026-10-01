/**
 * Page Metadata Provider Component
 * Provides page metadata context and management
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PageMeta {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  ogType?: 'website' | 'article' | 'video';
  canonical?: string;
}

interface PageMetaProviderProps {
  children: React.ReactNode;
  defaultMeta?: PageMeta;
}

interface PageMetaContextValue {
  pageMeta: PageMeta;
  setPageMeta: (meta: PageMeta) => void;
  resetPageMeta: () => void;
}

const PageMetaContext = createContext<PageMetaContextValue | undefined>(undefined);

export function PageMetaProvider({ children, defaultMeta = {} }: PageMetaProviderProps) {
  const [pageMeta, setPageMeta] = useState<PageMeta>(defaultMeta);

  // Reset to default when component unmounts
  useEffect(() => {
    return () => {
      setPageMeta(defaultMeta);
    };
  }, [defaultMeta]);

  const resetPageMeta = () => {
    setPageMeta(defaultMeta);
  };

  const contextValue: PageMetaContextValue = {
    pageMeta,
    setPageMeta,
    resetPageMeta,
  };

  return (
    <PageMetaContext.Provider value={contextValue}>
      {children}
    </PageMetaContext.Provider>
  );
}

export function usePageMeta() {
  const context = useContext(PageMetaContext);
  if (context === undefined) {
    throw new Error('usePageMeta must be used within a PageMetaProvider');
  }
  return context;
}
