const { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;
let tray;
let isQuitting = false;

const API_BASE = 'http://127.0.0.1:8000';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('public/index.html');

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Create a simple tray icon (you'll need to add an actual icon file)
  tray = new Tray(path.join(__dirname, '../public/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Clipboard History',
      click: () => {
        showClipboardHistory();
      }
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
    showClipboardHistory();
  });
}

function showClipboardHistory() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
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

function detectContentType(content) {
  if (content.match(/^https?:\/\//)) {
    return 'url';
  }
  if (content.match(/(def |function |class |import |const |let |var )/)) {
    return 'code';
  }
  return 'text';
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Register global shortcut Ctrl+Shift+V
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    showClipboardHistory();
  });
  
  // Start monitoring clipboard
  monitorClipboard();
  
  console.log('Smart Clip started. Press Ctrl+Shift+V to show clipboard history.');
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
