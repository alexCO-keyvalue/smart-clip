const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class MainDashboardWindow {
  constructor() {
    this.window = null;
  }

  create() {
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      frame: false,
      resizable: true,
      transparent: true, // Enable window transparency
      backgroundColor: 'rgba(0, 0, 0, 0)', // Fully transparent background
      vibrancy: 'ultra-dark', // macOS vibrancy effect
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.window.loadFile('public/dashboard.html');

    // Handle window controls
    ipcMain.on('window-control', (event, action) => {
      if (event.sender === this.window.webContents) {
        switch (action) {
          case 'close':
            this.window.close();
            break;
          case 'minimize':
            this.window.minimize();
            break;
          case 'maximize':
            if (this.window.isMaximized()) {
              this.window.unmaximize();
            } else {
              this.window.maximize();
            }
            break;
        }
      }
    });

    return this.window;
  }

  show() {
    if (this.window) {
      this.window.show();
      this.window.focus();
    }
  }

  hide() {
    if (this.window) {
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

module.exports = MainDashboardWindow; 