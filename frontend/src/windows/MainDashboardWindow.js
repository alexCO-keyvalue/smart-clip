const { BrowserWindow } = require('electron');
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
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.window.loadFile('public/dashboard.html');

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