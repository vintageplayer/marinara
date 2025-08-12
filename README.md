# Marinara: Pomodoro® Assistant (Manifest V3)

A modern Pomodoro® time management assistant for Chrome, built with React and TypeScript, updated for Manifest V3.

> **Note**: This is a modern update of the popular [Marinara Pomodoro Timer](https://github.com/schmich/marinara) by Chris Schmich, ported to Manifest V3 with React and TypeScript. All credit for the original concept, design, and functionality goes to the original Marinara project.

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

## Credits

This project is built upon the excellent [Marinara Pomodoro Timer](https://github.com/schmich/marinara) by Chris Schmich. The original Marinara extension provided the foundation for this Manifest V3 update, including:

* Core timer functionality and Pomodoro workflow
* UI/UX design principles and layout
* Audio assets and notification system
* History tracking and statistics features

Special thanks to Chris Schmich and all the contributors to the original Marinara project for creating such a robust and well-designed Pomodoro timer.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Trademark Notice

Pomodoro® and The Pomodoro Technique® are trademarks of Francesco Cirillo. This extension is not affiliated with or endorsed by Francesco Cirillo.
