const { BrowserWindow } = require('electron');
const path = require('path');

class QuickAccessWindow {
  constructor() {
    this.window = null;
  }

  create() {
    this.window = new BrowserWindow({
      width: 400,
      height: 600,
      show: false, // Don't show immediately
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      movable: true, // Enable window dragging
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.window.loadFile('public/quick-access.html');

    // Hide window when it loses focus
    this.window.on('blur', () => {
      if (!this.window.webContents.isDevToolsOpened()) {
        this.hide();
      }
    });

    return this.window;
  }

  show() {
    if (this.window) {
      if (this.window.isVisible()) {
        this.hide();
      } else {
        console.log('Showing quick access window');
        this.window.show();
        this.window.focus();
        // Trigger refresh of clipboard data
        this.window.webContents.send('refresh-data');
      }
    }
  }

  hide() {
    if (this.window && this.window.isVisible()) {
      this.window.hide();
    }
  }

  isVisible() {
    return this.window && this.window.isVisible();
  }

  getWindow() {
    return this.window;
  }

  destroy() {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = QuickAccessWindow; 