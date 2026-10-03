import { useState } from "react";

export interface UseMinimizeHandle {
  handleMinimize: () => void;
}

export function useMinimizeHandle(): UseMinimizeHandle {
  return {
    handleMinimize: () => {
      // TODO: Implement window minimize
    },
  };
}
