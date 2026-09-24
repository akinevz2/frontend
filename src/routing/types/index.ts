// Define metadata structure for route meta properties
export interface RouteMeta extends Record<string, unknown> {
  keywords?: string[];
  author?: string;
  image?: string;
  publishedAt?: string;
  updatedAt?: string;
  priority?: number;
}

// Define component props interface (can be extended with specific props)
export interface RouteProps {
  children?: React.ReactNode;
}

// Export component type as a proper generic
export type RouteComponent<P = RouteProps> = React.ComponentType<P>;

// Main route configuration interface
export interface Route {
  path: string;
  title: string;
  description: string;
  component: RouteComponent;
  hidden?: boolean;
  meta?: RouteMeta;
}

// Static route configuration interface (for config file use)
export interface RouteConfig {
  path: string;
  title: string;
  description: string;
  hidden?: boolean;
  meta?: RouteMeta;
  component?: unknown;
}

export interface RouteMatch {
  route: Route | RouteConfig;
  params: { [key: string]: string | number };
  path: string;
}

// Type guard for checking if route is a full Route
export function isRoute(route: Route | RouteConfig): route is Route {
  return "component" in route;
}

export interface RoutingState {
  path: string;
}

export type RoutingAction =
  { type: "NAVIGATE"; path: string } | { type: "POPSTATE"; path: string };

export interface RoutingOptions {
  normalizePath: (path: string) => string;
  isInternalPath: (href: string) => boolean;
}
