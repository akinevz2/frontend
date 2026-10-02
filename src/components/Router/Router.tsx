import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PageSpace } from "../PageSpace";
import NotFoundPage from "../../pages/NotFoundPage";

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageSpace page="home" />} />
        <Route path="/projects/*" element={<PageSpace page="projects" />} />
        <Route
          path="/blog/random/*"
          element={<PageSpace page="blog/random" />}
        />
        <Route path="/404" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
