import { createContext, useContext, ReactNode } from "react";

export interface PageMeta {
  title: string;
  description: string;
}

interface PageMetaContextValue {
  meta: PageMeta | null;
  setMeta: (meta: PageMeta) => void;
  clearMeta: () => void;
}

const PageMetaContext = createContext<PageMetaContextValue | undefined>(undefined);

interface PageMetaProviderProps {
  children: ReactNode;
}

export function PageMetaProvider({ children }: PageMetaProviderProps) {
  const [meta, setMeta] = React.useState<PageMeta | null>(null);

  const clearMeta = () => {
    setMeta(null);
  };

  return (
    <PageMetaContext.Provider value={{ meta, setMeta, clearMeta }}>
      {children}
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