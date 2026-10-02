import { useContext } from "react";
import { PageContext } from "../statefulness/PageContext";

/**
 * Custom hook to access page context functionality
 * 
 * This hook provides access to the usePages and usePage functions from the PageContext.
 * It was created as part of refactor phase 2 for simplified page management.
 */
export function usePages() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePages must be used within a PageProvider");
  }
  
  // Return the usePages function from the context
  return context.usePages;
}

/**
 * Custom hook to find a specific page component by path
 * 
 * This hook provides access to the usePage function from the PageContext.
 * It was created as part of refactor phase 2 for simplified page management.
 */
export function usePage(path: string) {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePage must be used within a PageProvider");
  }
  
  // Return the usePage function from the context
  return context.usePage;
}
