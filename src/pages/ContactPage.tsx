import "xp.css/dist/98.css";
import "../components/PageSpace.css";
import "../pages/ContactPage.css";

import React from "react";

interface PageSpaceProps {
  children: React.ReactNode;
}

export function PageSpace({ children }: PageSpaceProps) {
  return <div className="PageSpace">{children}</div>;
}

const ContactPage = () => {
  return (
    <div className="ContactPage">
      <div className="ContactWindow">
        <div className="title-bar">
          <div className="title-bar-text">Contact Me</div>
        </div>
        <div className="window-body">
          <div className="ContactContent">
            <h2 className="ContactSubheading">Where you can find kine online!</h2>
            <ul className="ContactLinks">
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://akinevz.com/resume"
                  target="_blank"
                  rel="noreferrer"
                >
                  akinevz.com/resume
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://akinevz.com/pagerts"
                  target="_blank"
                  rel="noreferrer"
                >
                  pagerts
                </a>
                <span className="ContactLink"> - my CLI project</span>
              </li>
              <li></li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://github.com/akinevz2"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/akinevz2
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://github.com/akinevz"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/akinevz
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://www.youtube.com/@akinevz"
                  target="_blank"
                  rel="noreferrer"
                >
                  youtube.com/@akinevz
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://soundcloud.com/akinevz"
                  target="_blank"
                  rel="noreferrer"
                >
                  soundcloud.com/akinevz
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://www.linkedin.com/in/akinevz/"
                  target="_blank"
                  rel="noreferrer"
                >
                  linkedin.com/in/akinevz
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://www.instagram.com/akinevz2/"
                  target="_blank"
                  rel="noreferrer"
                >
                  instagram.com/akinevz2
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="https://x.com/akinevz"
                  target="_blank"
                  rel="noreferrer"
                >
                  x.com/akinevz
                </a>
              </li>
              <li></li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="mailto:akinevz@gmail.com"
                >
                  akinevz@gmail.com
                </a>
              </li>
              <li className="ContactLink">
                <a
                  className="ContactLink"
                  href="mailto:akinevz@outlook.com"
                >
                  akinevz@outlook.com
                </a>
              </li>
              <li></li>
              <li></li>
            </ul>
            <h2 className="ContactSubheading">funny within</h2>
            <p className="ContactFooter">
              click here to look at the <a href="#fuckingclippy">fuckingclippy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;