# Agent Instructions for Turret Doom

## Project Overview
Turret Doom is a tower defense game built as an Electron desktop application using React, Vite, and Canvas for rendering. It features hex-grid gameplay, turrets, upgrades, and progression systems. The UI uses shadcn/ui components with Tailwind CSS, and animations via Framer Motion.

## Build and Development
- **Start development**: `npm run electron-dev` (runs Vite dev server and Electron concurrently)
- **Build for production**: `npm run build && npm run electron-pack`
- **Lint code**: `npm run lint:fix`
- **Type check**: `npm run typecheck`

## Architecture Decisions
- **Frontend**: React 18 with JSX, no TypeScript but jsconfig.json for type checking
- **Game Rendering**: Canvas-based via GameEngine class for performance
- **State Management**: React Query for server state (saves), local React state for game logic
- **UI Components**: shadcn/ui (Radix UI primitives) in `src/components/ui/`
- **Electron**: Main process in `electron.cjs`, preload in `preload.cjs` for secure IPC
- **Styling**: Tailwind CSS with custom colors defined in GameConstants.jsx
- **Persistence**: Local storage for saves, optional cloud via entities

## Project Conventions
- **Imports**: Use `@/` alias for `src/` directory
- **Component Naming**: PascalCase for React components
- **File Extensions**: `.jsx` for components, `.js` for utilities
- **Game Data**: Centralized in `GameConstants.jsx` (turrets, upgrades, colors)
- **Icons**: Lucide React icons
- **Localization**: UI text in Spanish (HTML lang="es")

## Key Files and Directories
- `src/App.jsx`: Root component with routing and authentication
- `src/pages/Game.jsx`: Game screen manager (MENU, LEVEL_SELECT, PLAYING, GAME_OVER)
- `src/components/game/MainMenu.jsx`: Main menu UI, including app close button
- `src/components/game/GameEngine.jsx`: Core game logic and rendering
- `src/components/game/GameConstants.jsx`: All game constants and data
- `src/components/ui/`: shadcn/ui components (Button, Dialog, etc.)
- `electron.cjs`: Electron main process setup
- `preload.cjs`: IPC bridge for renderer to main process communication

## Potential Pitfalls
- Electron runs fullscreen without native window frame; all controls must be custom
- Canvas rendering is separate from React; avoid React re-renders during gameplay
- Close button in MainMenu requires IPC handler in electron.cjs for 'close-app' event
- No automated tests; rely on manual QA
- Ensure dependencies (especially Radix UI) are compatible to avoid breaking changes

## UI Components Usage
- Import from `@/components/ui/` (e.g., `import { Button } from "@/components/ui/button"`)
- Close buttons in dialogs use `<X className="h-4 w-4" />` with absolute positioning
- App-level close: `window.electronApp.close()` (requires preload setup)

For detailed component APIs, see [Radix UI documentation](https://www.radix-ui.com/).