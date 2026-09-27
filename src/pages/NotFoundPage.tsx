import "xp.css/dist/98.css";
import "../components/PageSpace.css";
import "../pages/NotFoundPage.css";

const NotFoundPage = () => {
  return (
    <div className="NotFoundPage">
      <div className="NotFoundWindow">
        <div className="title-bar">
          <div className="title-bar-text">Not Found</div>
        </div>
        <div className="window-body">
          <div className="NotFoundBody">
            <p className="NotFoundMessage">That page does not exist.</p>
            <a className="NotFoundLink" href="/">
              Go home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
