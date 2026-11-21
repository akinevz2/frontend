# Page Types Documentation

This document defines the page types supported by the website, their content structure, and implementation guidelines.

## Overview

All pages implement the `BasePage` component which serves as the main entry point. Each page type is defined in `src/pages/pages.json` with specific attributes that determine how the page loads and renders its content.

## Page Structure

Each page entry in `pages.json` contains:
- `path`: The URL path for this page
- `menuLabel`: Text to display in navigation menus
- `title`: Page title for SEO and meta tags
- `description`: Page description for SEO and meta tags  
- `page`: Component name to render (must be a functional component)
- `structure`: Path to JSON file containing page content structure

## BasePage Implementation

`BasePage` is the primary page wrapper that:
1. Loads page content from the context based on current route
2. Renders the appropriate page component
3. Consumes the `PageContext` to determine what content to render

### Usage Example:

```tsx
import { BasePage } from "../pages/BasePage";

// BasePage will automatically load content and render the correct page component
// based on the current URL path and configuration in pages.json
```

## Available Page Components

### 1. `BasePage` - Default Page Component
- Implements standard page layout with navigation
- Serves as fallback for pages not requiring special handling
- Supports custom content rendering through context

### 2. `SitemapPageGen` - Sitemap Generator
- Renders website sitemap structure
- Provides immersive map of the site content

### 3. `AddonsPage` - Addons Page Component
- Specialized layout for addons section  
- Handles addon-specific functionality and display

### 4. `ProjectsPage` - Projects Page Component
- Displays project listings and details
- Supports project-based content structure

### 5. `MusicPage` - Music Page Component
- Renders music content and tracks
- Integrates with SoundCloud or other music platforms

### 6. `BlogPage` - Blog Page Component
- Handles blog posts and articles
- Supports markdown or structured content rendering

### 7. `ResumePage` - Resume Page Component
- Displays resume/CV information
- Custom styling for professional presentation

### 8. `NotFoundPage` - 404 Page Component
- Handles route not found scenarios
- Provides navigation back to main site

## Content Loading Flow

1. Router identifies current path
2. `BasePage` queries `PageContext` using path 
3. Context returns proper page component and content
4. Component renders with configured structure and content

## Implementation Guidelines

1. All page components should be functional components
2. Pages should accept and render custom content via the context system
3. Structure files should be located in `src/pages/structure/`
4. Each page type can override default behavior while still using BasePage as foundation
5. Content structure is defined by JSON files referenced in `pages.json`

## Configuration Format

The `pages.json` file supports the following keys for each page entry:
- `path`: URL path (string)
- `menuLabel`: Menu display text (string or null)  
- `title`: Page title (string)
- `description`: Page description (string)
- `page`: Component to render (string, references function name)
- `structure`: Content structure file path (string)

> Note: The content and structure keys in pages.json are automatically processed and made available through the PageContext for each page component to consume.