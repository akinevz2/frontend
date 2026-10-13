import { Link } from "react-router-dom";

export const NotFoundPage = () => (
  <div className="window">
    <div className="title-bar">
      <div className="title-bar-text">Not Found</div>
    </div>
    <div className="window-body">
      <p>That page does not exist.</p>
      <Link to="/">Go home</Link>
    </div>
  </div>
);
