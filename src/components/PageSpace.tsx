// PageSpace Component - Layout Wrapper for Content
// This component provides the scrollable container for page content
// It wraps page components that render inside it

import "xp.css/dist/98.css";
import "./PageSpace.css";

export default function PageSpace({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <div className="PageSpace">{children}</div>;
}
