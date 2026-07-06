# source for kine's website

[![CI/CD Pipeline](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/akinevz2/website)
[![License](https://img.shields.io/badge/license-proprietary-blue.svg)](./SECURITY.md)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

A modern, performant personal website built with [Astro](https://astro.build) and TypeScript, featuring dynamic content management through JSON-to-HTML transformation.

## Features

- ⚡ **Fast & Modern**: Built with Astro for optimal performance and modern web standards
- 🎨 **Dynamic Content**: JSON-driven architecture for easy content management
- 📦 **Component-Based**: Reusable React and Astro components for consistent UI
- 🔒 **Secure**: Security-first design with best practices (see [SECURITY.md](./SECURITY.md))
- 🧪 **Well-Tested**: ESLint and TypeScript for code quality
- 📱 **Responsive**: Mobile-friendly design with modern CSS

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/akinevz2/website.git
cd website

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

## Project Structure

```
website/
├── src/
│   ├── components/          # React and Astro components
│   │   ├── Addon.tsx
│   │   ├── AddonsList.astro
│   │   ├── CopyToClipboardButton.tsx
│   │   ├── Modal.tsx
│   │   ├── NavBar.astro
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── pages/               # Astro pages
│   │   ├── index.astro
│   │   ├── addons.astro
│   │   └── contact.astro
│   ├── styles/              # Global styles
│   └── addons.json          # Addon data
├── public/                  # Static assets
│   ├── addons/              # Addon files
│   └── robots.txt
├── package.json
├── astro.config.mjs
├── tsconfig.json
└── README.md
```

## Content Management

This site uses JSON files for dynamic content:

- **addons.json**: Configuration and metadata for browser addons
- **sections.json**: Page sections and structure

To add new content, simply update the corresponding JSON file and rebuild.

## Security

This project takes security seriously. See [SECURITY.md](./SECURITY.md) for:

- Security features and protections
- How to report vulnerabilities
- Best practices for users
- Security checklist for contributors

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Write tests for new features where applicable
- Follow the existing code style (enforced by ESLint)
- Update documentation as needed
- Ensure all types are correct (`npm run type-check`)
- Run lint checks (`npm run lint`)

## License & Author

This repository is for **academic use only**. Repository's home is at [github.com/akinevz2/](https://github.com/akinevz2/)

Please respect the author's choices.

---

**Author**: Kirill "kine" Nevzorov
