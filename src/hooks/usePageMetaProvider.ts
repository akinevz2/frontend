import React, { type ReactNode } from "react";
import { createContext, useContext, } from "react";

export interface PageMeta {
  title: string;
  description: string;
}

interface PageMetaContextValue {
  meta: PageMeta | null;
  setMeta: (meta: PageMeta) => void;
}

const PageMetaContext = createContext<PageMetaContextValue | undefined>(undefined);

interface PageMetaProviderProps {
  children: ReactNode;
}

export function PageMetaProvider({ children }: PageMetaProviderProps) {
  const [meta, setMeta] = React.useState<PageMeta | null>(null);

  return (
    <PageMetaContext.Provider value= {} >
    { children }
    </PageMetaContext.Provider>
  );
}

export function usePageMeta() {
  const context = useContext(PageMetaContext);
  if (!context) {
    throw new Error("usePageMeta must be used within a PageMetaProvider");
  }
  return context;
}

// Legacy hook for backwards compatibility
export const usePageMetaProvider = () => {
  const context = useContext(PageMetaContext);
  if (!context) {
    throw new Error("usePageMetaProvider must be used within a PageMetaProvider");
  }
  return context;
};