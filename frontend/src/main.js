const { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

// Import window managers
const QuickAccessWindow = require('./windows/QuickAccessWindow');
const MainDashboardWindow = require('./windows/MainDashboardWindow');

// Import shared utilities
const { detectContentType } = require('./renderer/shared/utils');

let quickAccessWindow;
let dashboardWindow;
let tray;
let isQuitting = false;

const API_BASE = 'http://127.0.0.1:8000';

function createWindows() {
  // Create quick access window (current functionality)
  quickAccessWindow = new QuickAccessWindow();
  quickAccessWindow.create();

  // Create dashboard window (placeholder for now)
  dashboardWindow = new MainDashboardWindow();
  dashboardWindow.create();

  // Handle window close events
  quickAccessWindow.getWindow().on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      quickAccessWindow.hide();
    }
  });

  dashboardWindow.getWindow().on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
    }
  });
}

function createTray() {
  // Create a simple tray icon (you'll need to add an actual icon file)
  tray = new Tray(path.join(__dirname, '../public/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Quick Access',
      click: () => {
        showQuickAccess();
      }
    },
    {
      label: 'Show Dashboard',
      click: () => {
        showDashboard();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Smart Clip - Clipboard Manager');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    showQuickAccess();
  });
}

function showQuickAccess() {
  if (quickAccessWindow) {
    quickAccessWindow.show();
  }
}

function showDashboard() {
  if (dashboardWindow) {
    dashboardWindow.show();
  }
}

let lastClipboardContent = '';

function monitorClipboard() {
  setInterval(async () => {
    const currentContent = clipboard.readText();
    
    if (currentContent && currentContent !== lastClipboardContent) {
      lastClipboardContent = currentContent;
      
      // Send to backend API
      try {
        await axios.post(`${API_BASE}/api/clipboard`, {
          content: currentContent,
          type: detectContentType(currentContent),
          source_app: 'unknown', // Could be enhanced to detect source app
          tags: []
        });
        console.log('Clipboard content saved:', currentContent.substring(0, 50) + '...');
      } catch (error) {
        console.error('Failed to save clipboard content:', error.message);
      }
    }
  }, 1000); // Check every second
}

// Content type detection moved to shared utils

// IPC handlers for renderer processes
ipcMain.on('hide-quick-access', () => {
  if (quickAccessWindow) {
    quickAccessWindow.hide();
  }
});

app.whenReady().then(() => {
  createWindows();
  createTray();
  
  // Register global shortcut Ctrl+Shift+V for quick access
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    showQuickAccess();
  });
  
  // Start monitoring clipboard
  monitorClipboard();
  
  console.log('Smart Clip started. Press Ctrl+Shift+V to show quick access.');
});

app.on('window-all-closed', (event) => {
  event.preventDefault(); // Prevent app from quitting
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
