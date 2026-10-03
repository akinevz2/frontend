import { type ReactNode } from "react";

export interface PageProps {
  page: string;
}

export function PageSpace({ page }: PageProps) {
  return <div className="page-space">PageSpace component for {page}</div>;
}