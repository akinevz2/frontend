import { useState } from "react";

export interface UseMaximizeHandle {
  handleMaximize: () => void;
}

export function useMaximizeHandle(): UseMaximizeHandle {
  return {
    handleMaximize: () => {
      // TODO: Implement window maximize
    },
  };
}
