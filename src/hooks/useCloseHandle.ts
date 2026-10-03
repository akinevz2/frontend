import { useState } from "react";

export interface UseCloseHandle {
  handleClose: () => void;
}

export function useCloseHandle(): UseCloseHandle {
  return {
    handleClose: () => {
      // TODO: Implement window close
    },
  };
}
