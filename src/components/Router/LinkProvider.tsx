import { useNavigate } from "react-router-dom";
import React, { createContext, useContext, ReactNode } from "react";

interface LinkContextValue {
  pushState: (url: string, hash?: string) => void;
  isExternal: (href: string) => boolean;
}

const LinkContext = createContext<LinkContextValue | null>(null);

interface LinkProviderProps {
  children: ReactNode;
}

export function LinkProvider({ children }: LinkProviderProps) {
  const navigate = useNavigate();

  const pushState = (url: string, hash?: string) => {
    const targetUrl = hash ? `${url}#${hash}` : url;
    window.history.pushState({}, "", targetUrl);
  };

  const isExternal = (href: string): boolean => {
    try {
      const url = new URL(href, window.location.origin);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  };

  return (
    <LinkContext.Provider value={{ pushState, isExternal }}>
      {children}
    </LinkContext.Provider>
  );
}

export function useLink() {
  const context = useContext(LinkContext);
  if (!context) {
    throw new Error("useLink must be used within LinkProvider");
  }
  return context;
}
