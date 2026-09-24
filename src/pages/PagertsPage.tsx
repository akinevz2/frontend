import "xp.css/dist/98.css";
import "../components/PageSpace.css";
import "../pages/PagertsPage.css";

import React from "react";

interface PageSpaceProps {
  children: React.ReactNode;
}

export function PageSpace({ children }: PageSpaceProps) {
  return <div className="PageSpace">{children}</div>;
}

const PagertsPage = () => {
  return (
    <div className="PagertsPage">
      <div className="PagertsWindow">
        <div className="title-bar">
          <div className="title-bar-text">pagerts - TypeScript Page Router</div>
        </div>
        <div className="window-body">
          <p className="PagertsIntro">
            pagerts is a secure, modern TypeScript CLI tool that transforms URLs
            into structured JSON objects, extracting all navigable items and
            resources from webpages.
          </p>
          <h3 className="PagertsFeatures">Features</h3>
          <ul className="PagertsFeatureList">
            <li className="PagertsFeatureItem">🔒 Security-First</li>
            <li className="PagertsFeatureItem">🚀 Modern TypeScript</li>
            <li className="PagertsFeatureItem">⚡ Fast</li>
            <li className="PagertsFeatureItem">🧪 Well-Tested</li>
            <li className="PagertsFeatureItem">📦 Easy to Use</li>
            <li className="PagertsFeatureItem">🗂️ Local File Support</li>
            <li className="PagertsFeatureItem">🧭 Request Header Override</li>
          </ul>
          <h3 className="PagertsInstall">Installation</h3>
          <div className="PagertsInstallCode">npm install -g pagerts</div>
          <div className="PagertsInstallCode">pagerts ./page.html</div>
          <h4 className="PagertsSubheading">
            Using npx (No Installation Required)
          </h4>
          <div className="PagertsUsageCode">npx pagerts ./page.html</div>
          <h3 className="PagertsUsage">Usage</h3>
          <div className="PagertsUsageCode">pagerts ./page.html</div>
          <div className="PagertsUsageCode">pagerts file:///path/to/file.html</div>
          <div className="PagertsUsageCode">pagerts fetch https://website.com</div>
          <div className="PagertsUsageCode">
            pagerts fetch --user-agent "Mozilla/5.0..." https://example.com
          </div>
          <h3 className="PagertsOutput">Output</h3>
          <p>The output is JSON containing:</p>
          <ul className="PagertsOutputList">
            <li><strong>title</strong>: Page's title from &lt;title&gt; tag</li>
            <li><strong>url</strong>: URL of the page</li>
            <li>
              <strong>resources</strong>: Array of resources (links, meta tags,
              embeds) with name and url fields
            </li>
          </ul>
          <h3 className="PagertsLinks">Links</h3>
          <ul>
            <li>
              <a className="PagertsLink" href="https://www.npmjs.com/package/pagerts">
                npm package
              </a>
            </li>
            <li>
              <a
                className="PagertsLink"
                href="https://github.com/akinevz2/pagerts"
              >
                GitHub repository
              </a>
            </li>
            <li>
              <a
                className="PagertsLink"
                href="https://github.com/akinevz2/pagerts/blob/main/src/resource.ts"
              >
                Source Code
              </a>
            </li>
            <li>
              <a
                className="PagertsLink"
                href="https://github.com/akinevz2/pagerts/blob/main/CHANGELOG.md"
              >
                CHANGELOG
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PagertsPage;