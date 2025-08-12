# Marinara: Pomodoro® Assistant (Manifest V3)

A modern Pomodoro® time management assistant for Chrome, built with React and TypeScript, updated for Manifest V3.

## Features

* **Timer Management**: Focus sessions, short breaks, and long breaks
* **History Tracking**: Detailed statistics and visual charts
* **Customizable Settings**: Timer durations, notification preferences, and audio alerts
* **Data Export/Import**: Backup and restore your Pomodoro history
* **Modern Architecture**: Built with Manifest V3, React, and TypeScript

## Prerequisites

* [node + npm](https://nodejs.org/) (Current Version)

## Tech Stack

* **TypeScript** - Type-safe development
* **React** - Modern UI framework
* **Webpack** - Module bundling
* **Tailwind CSS** - Utility-first styling
* **Chrome Manifest V3** - Latest extension architecture

## Development Setup

```bash
npm install
```

## Build

```bash
npm run build
```

## Development Mode

```bash
npm run watch
```

## Load Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` directory

## Testing

```bash
npm run test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Trademark Notice

Pomodoro® and The Pomodoro Technique® are trademarks of Francesco Cirillo. This extension is not affiliated with or endorsed by Francesco Cirillo.
