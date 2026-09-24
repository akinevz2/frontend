/**
 * Custom hook for managing route hash state and change notifications.
 * Extracted from App.tsx to provide reusable hash management functionality.
 */

import { useEffect, useState } from "react";

/**
 * Route hash state interface
 */
export interface RouteHashState {
  hash: string;
  isLoading: boolean;
}

/**
 * Type definition for hash change handler function
 */
export type HashChangeHandler = (newHash: string) => void;

/**
 * Custom hook for managing route hash state and change events.
 * Provides a centralized way to track and react to hash changes.
 * 
 * @param initialHash - Optional initial hash value (default: '')
 * @param onChange - Optional callback function called when hash changes
 * @param enabled - Whether to enable hash change tracking (default: true)
 * @returns RouteHashState object with hash and isLoading properties
 */
export function useRouteHash(
  initialHash: string = "",
  onChange?: HashChangeHandler,
  enabled: boolean = true
): RouteHashState {
  const [hash, setHash] = useState<string>(initialHash);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle window hash changes
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const newHash = window.location.hash;
      setHash(newHash);
      
      if (onChange) {
        onChange(newHash);
      }
    };

    // Set initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange, { passive: true });

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [enabled, onChange]);

  return { hash, isLoading };
}

/**
 * Hook for managing route hash with loading states and validation.
 * 
 * @param initialHash - Optional initial hash value (default: '')
 * @param options - Hook options including validation and callbacks
 * @returns RouteHashState with hash and additional meta properties
 */
export function useRouteHashWithValidation(
  initialHash: string = "",
  options?: {
    validate?: (hash: string) => boolean;
    onInvalid?: (hash: string) => void;
    onValid?: (hash: string) => void;
    enabled?: boolean;
  }
): RouteHashState & {
  isValid: boolean;
  validate: () => boolean;
} {
  const { 
    validate = (h: string) => true, 
    onInvalid, 
    onValid,
    enabled = true 
  } = options || {};

  const [hash, setHash] = useState<string>(initialHash);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle window hash changes with validation
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const newHash = window.location.hash;
      const isValid = validate(newHash);

      setHash(newHash);
      setIsLoading(false);

      if (isValid && onValid) {
        onValid(newHash);
      } else if (!isValid && onInvalid) {
        onInvalid(newHash);
      }
    };

    // Set initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange, { passive: true });

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [enabled, validate, onValid, onInvalid]);

  const validateLocal = () => validate(hash);
  const isValid = validateLocal();

  return { 
    hash, 
    isLoading, 
    isValid, 
    validate: validateLocal 
  };
}

/**
 * Hook for managing hash-based navigation with automatic state management.
 * 
 * @param initialHash - Optional initial hash value (default: '')
 * @param callbacks - Configuration for hash navigation behavior
 * @returns Object with hash state and navigation utilities
 */
export function useHashNavigation(
  initialHash: string = "",
  callbacks?: {
    onLoad?: (hash: string) => void;
    onUnload?: (hash: string) => void;
    replace?: boolean;
  }
) {
  const { 
    onLoad, 
    onUnload,
    replace = true 
  } = callbacks || {};

  const [hash, setHash] = useState<string>(initialHash);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle window hash changes with navigation logic
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const newHash = window.location.hash;
      
      if (onLoad) {
        onLoad(newHash);
      }

      setHash(newHash);
    };

    // Handle window unload events
    const handleUnload = () => {
      if (onUnload && hash) {
        onUnload(hash);
      }
    };

    // Set initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange, { passive: true });
    
    // Listen for before unload to clean up
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [hash, onLoad, onUnload]);

  const navigateToHash = (newHash: string) => {
    if (replace) {
      window.location.replace(newHash);
    } else {
      window.location.hash = newHash;
    }
    setIsLoading(true);
  };

  return { hash, isLoading, navigateToHash };
}