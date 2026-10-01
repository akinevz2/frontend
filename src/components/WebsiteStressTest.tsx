/**
 * WebsiteStressTest - Stress test component for routing behavior
 * Phase 6: Complete routing implementation
 * 
 * This clean implementation bypasses routing entirely for stress testing purposes.
 * Provides direct page rendering without complex routing logic.
 */

import "xp.css/dist/98.css";
import { BasePage } from "../pages/BasePage";
import type { SectionProps } from "../windows/types.d.ts";
import BlogPage from "../pages/BlogPage";

/**
 * WebsiteStressTest - Direct page rendering for stress testing
 * Bypasses routing entirely to test page components independently
 */
export default function WebsiteStressTest() {
  // For stress testing: bypass routing entirely
  return (
    <div className="Website" data-testid="stress-test">
      {/* Direct MenuBar rendering */}
      <div className="menu-bar">
        <div className="menu-underline">B</div>blog
      </div>

      {/* Direct Page rendering */}
      <main className="page-container">
        <section className="page-content">
          {/* Use BasePage composition */}
          <BlogPage />
        </section>
      </main>

      {/* Optional: Meta tags injection */}
      <title>blog of kine</title>
      <meta name="description" content="posts and notes from kine" />
    </div>
  );
}
