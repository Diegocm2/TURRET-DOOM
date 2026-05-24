# Skill: finish-close-button

## Description
This skill automates the completion of a close button implementation in an Electron desktop application. It identifies missing IPC handlers in the main process and adds the necessary code to properly close the application when the close button is clicked.

## When to Use
Use this skill when:
- The UI has a close button that calls `window.electronApp.close()` or similar
- The preload script exposes a close function that sends an IPC message
- The main process (electron.cjs) does not handle the IPC message, causing the close button to not work
- You need to ensure the Electron app can be closed via custom UI controls

## Tools
- Code reading tools (read_file, grep_search) to examine preload and main process files
- Code editing tools (replace_string_in_file) to add the IPC handler

## Domain
Focused on Electron applications with:
- Custom window frames (frameless windows)
- IPC communication between renderer and main process
- Close buttons implemented via shadcn/ui or similar UI libraries
- Apps running in fullscreen mode without native controls

## Steps
1. **Verify IPC Message**: Check the preload script (preload.cjs) to confirm the IPC message sent by the close function (e.g., 'close-app').

2. **Check Main Process**: Examine the main process file (electron.cjs) to see if the IPC message is handled with `ipcMain.on()`.

3. **Add Handler**: If missing, add `ipcMain.on('close-app', () => app.quit())` in the main process, typically after the app.whenReady() block.

4. **Test**: Run the app and verify the close button works by clicking it.

## Quality Criteria
- The close button successfully closes the Electron window/app
- No console errors when clicking the close button
- IPC communication is secure (contextIsolation enabled)
- Handler is added in the appropriate location in electron.cjs

## Examples
- In Turret Doom: Add handler for 'close-app' message to close the fullscreen game window.