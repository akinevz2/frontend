import React from "react";
import { Link as ReactRouterLink, useLocation } from "react-router-dom";
import { useLink } from "./Link";

interface CustomLinkProps extends Omit<
  React.LinkHTMLAttributes<HTMLAnchorElement>,
  "to"
> {
  to: string;
  hash?: string;
  external?: boolean;
}

export function Link({
  to,
  hash,
  external,
  children,
  className = "",
  ...props
}: CustomLinkProps) {
  const location = useLocation();
  const { pushState, isExternal: checkExternal } = useLink();

  const isExt = external !== undefined ? external : checkExternal(to);

  if (isExt) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...props}
      >
        {children}
      </a>
    );
  }

  const fullHash = hash ? hash : "";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (hash) {
      pushState(to, hash);
      window.location.hash = hash;
    } else {
      pushState(to);
    }
  };

  return (
    <ReactRouterLink
      to={hash ? `${to}${hash}` : to}
      className={className}
      onClick={hash ? handleClick : undefined}
      {...props}
    >
      {children}
    </ReactRouterLink>
  );
}

export default Link;
