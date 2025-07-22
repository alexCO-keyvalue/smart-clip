const { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, ipcMain, screen } = require('electron');
const path = require('path');
const axios = require('axios');

// Import window managers
const QuickAccessWindow = require('./windows/QuickAccessWindow');
const MainDashboardWindow = require('./windows/MainDashboardWindow');

let quickAccessWindow;
let dashboardWindow;
let tray;
let isQuitting = false;

const API_BASE = 'http://127.0.0.1:8000';

// Add this variable to store the activeWindow function
let activeWindow = null;

// Initialize the get-windows module dynamically
async function initializeGetWindows() {
  try {
    const getWindows = await import('get-windows');
    activeWindow = getWindows.activeWindow;
    console.log('get-windows loaded successfully');
  } catch (error) {
    console.error('Failed to load get-windows:', error);
    activeWindow = null;
  }
}


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

// Enhanced system info with active window detection
async function getSourceContext() {
  try {
    // Check if activeWindow is available
    if (!activeWindow) {
      throw new Error('get-windows not available');
    }
    
    // Get the currently active window
    const activeWin = await activeWindow();
    
    return {
      platform: process.platform,
      timestamp: new Date().toISOString(),
      cursorPosition: screen.getCursorScreenPoint(),
      
      // App version information
      appName: app.getName(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      
      // Display hardware details
      primaryDisplay: screen.getPrimaryDisplay(),
      allDisplays: screen.getAllDisplays(),
      
      // Enhanced source app detection
      source_app: activeWin ? activeWin.owner.name : 'unknown',
      source_window_title: activeWin ? activeWin.title : null,
      source_bundle_id: activeWin ? activeWin.owner.bundleId : null, // macOS only
      source_process_id: activeWin ? activeWin.owner.processId : null,
      source_window_bounds: activeWin ? activeWin.bounds : null,
      source_executable_path: activeWin ? activeWin.owner.path : null,
      source_memory_usage: activeWin ? activeWin.memoryUsage : null,
      source_url: activeWin ? activeWin.url : null, // Browser URLs on macOS
    };
  } catch (error) {
    console.error('Failed to get active window:', error);
    
    // Fallback to basic context
    return {
      platform: process.platform,
      timestamp: new Date().toISOString(),
      cursorPosition: screen.getCursorScreenPoint(),
      appName: app.getName(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      primaryDisplay: screen.getPrimaryDisplay(),
      allDisplays: screen.getAllDisplays(),
      source_app: 'detection-failed',
    };
  }
}

// Enhanced clipboard content reading (keep this)
function readClipboardContent() {
  try {
    const availableFormats = clipboard.availableFormats();
    const content = {
      text: clipboard.readText(),
      html: '',
      rtf: '',
      hasImage: false,
      bookmark: null,
      availableFormats: availableFormats
    };

    // Read HTML if available (helps identify web sources)
    if (availableFormats.includes('text/html')) {
      content.html = clipboard.readHTML();
    }

    // Read RTF if available (may indicate rich text editors)
    if (availableFormats.includes('text/rtf')) {
      content.rtf = clipboard.readRTF();
    }

    // Check for image (may indicate screenshot tools, image editors)
    if (availableFormats.some(format => format.startsWith('image/'))) {
      content.hasImage = true;
      // Note: We're not reading the actual image data to avoid large payloads
    }

    // Read bookmark if available (identifies browser bookmarks)
    if (process.platform === 'darwin' || process.platform === 'win32') {
      try {
        const bookmarkData = clipboard.readBookmark();
        if (bookmarkData.title || bookmarkData.url) {
          content.bookmark = bookmarkData;
        }
      } catch (e) {
        // Ignore bookmark reading errors
      }
    }

    return content;
  } catch (error) {
    console.error('Failed to read clipboard content:', error);
    return { 
      text: clipboard.readText() || '', 
      error: 'Failed to read extended clipboard data' 
    };
  }
}

// Enhanced content detection with source app awareness
function detectContentType(content) {
  const text = content.text || '';
  
  // These types help identify the source application
  if (text.match(/^https?:\/\//)) {
    return 'url'; // Likely from browser
  }
  
  if (text.match(/(def |function |class |import |const |let |var |public |private)/)) {
    return 'code'; // Likely from code editor
  }
  
  if (text.match(/^[\/\\]|^[a-zA-Z]:[\/\\]|^~[\/\\]/)) {
    return 'file_path'; // Likely from file manager
  }
  
  if (text.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return 'email'; // Email clients
  }
  
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      JSON.parse(text);
      return 'json'; // API tools, config files
    } catch (e) {
      // Not valid JSON
    }
  }
  
  if (content.html && content.html.trim()) {
    return 'rich_text'; // Likely from web page or document
  }
  
  if (content.rtf && content.rtf.trim()) {
    return 'rich_text'; // Rich text editors
  }
  
  if (content.hasImage) {
    return 'image'; // Screenshot tools, image editors
  }
  
  if (content.bookmark) {
    return 'bookmark'; // Definitely from browser
  }
  
  return 'text';
}

// Enhanced content analysis
function analyzeContent(content) {
  const text = content.text || '';
  
  return {
    contentLength: text.length,
    wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
    lineCount: text.split('\n').length,
    hasFormatting: !!(content.html || content.rtf),
    formatCount: content.availableFormats?.length || 0
  };
}

// Enhanced tagging with source app intelligence
function generateSourceTags(content, contentType, analysis, sourceContext) {
  const tags = [contentType];
  const text = content.text || '';
  const appName = (sourceContext?.source_app || '').toLowerCase();
  
  // App-specific intelligent tagging
  const appMappings = {
    'google chrome': ['browser', 'web-content'],
    'chrome': ['browser', 'web-content'],
    'safari': ['browser', 'web-content'],
    'firefox': ['browser', 'web-content'],
    'microsoft edge': ['browser', 'web-content'],
    'visual studio code': ['code-editor', 'development'],
    'code': ['code-editor', 'development'],
    'sublime text': ['code-editor', 'development'],
    'atom': ['code-editor', 'development'],
    'vim': ['code-editor', 'development'],
    'emacs': ['code-editor', 'development'],
    'microsoft word': ['document', 'office'],
    'word': ['document', 'office'],
    'pages': ['document', 'office'],
    'google docs': ['document', 'office'],
    'notion': ['notes', 'productivity'],
    'obsidian': ['notes', 'knowledge'],
    'evernote': ['notes', 'productivity'],
    'slack': ['communication', 'work'],
    'discord': ['communication', 'social'],
    'teams': ['communication', 'work'],
    'terminal': ['command-line', 'development'],
    'iterm': ['command-line', 'development'],
    'finder': ['file-manager', 'system'],
    'file explorer': ['file-manager', 'system'],
    'photoshop': ['image-editor', 'creative'],
    'sketch': ['design', 'creative'],
    'figma': ['design', 'creative']
  };
  
  // Apply app-specific tags
  Object.entries(appMappings).forEach(([app, appTags]) => {
    if (appName.includes(app)) {
      tags.push(...appTags);
      tags.push(`from-${app.replace(/\s+/g, '-')}`);
    }
  });
  
  // If we have a detected source app, always add it as a tag
  if (sourceContext?.source_app && sourceContext.source_app !== 'unknown' && sourceContext.source_app !== 'detection-failed') {
    tags.push(`from-${sourceContext.source_app.toLowerCase().replace(/\s+/g, '-')}`);
  }
  
  // Content-based tags (existing logic)
  if (content.html) tags.push('web-content');
  if (content.rtf) tags.push('rich-formatting');
  if (content.bookmark) tags.push('browser');
  if (content.hasImage) tags.push('image-content');
  if (text.includes('http')) tags.push('contains-url');
  
  // Programming language detection (indicates IDE/editor)
  if (text.includes('def ') || text.includes('import ')) tags.push('python-code');
  if (text.includes('function ') || text.includes('const ')) tags.push('javascript-code');
  if (text.includes('public class')) tags.push('java-code');
  if (text.includes('#include') || text.includes('int main')) tags.push('c-code');
  
  // Content size indicators
  if (analysis.contentLength > 1000) tags.push('long-content');
  if (analysis.contentLength < 20) tags.push('short-content');
  if (analysis.lineCount > 50) tags.push('multi-line');
  
  // Format indicators
  if (analysis.hasFormatting) tags.push('formatted-content');
  if (analysis.formatCount > 3) tags.push('rich-formats');
  
  return [...new Set(tags)]; // Remove duplicates
}

// Enhanced clipboard monitoring with source detection
function monitorClipboard() {
  setInterval(async () => {
    const clipboardContent = readClipboardContent();
    const currentText = clipboardContent.text || '';
    
    if (currentText && currentText !== lastClipboardContent) {
      lastClipboardContent = currentText;
      
      const contentType = detectContentType(clipboardContent);
      const analysis = analyzeContent(clipboardContent);
      
      // Get enhanced source context with active window detection
      const context = await getSourceContext();
      
      const clipboardData = {
        content: clipboardContent,
        type: contentType,
        analysis: analysis,
        context: context,
        tags: generateSourceTags(clipboardContent, contentType, analysis, context)
      };
      
      try {
        await axios.post(`${API_BASE}/api/clipboard`, clipboardData);
        console.log('Clipboard saved with enhanced source detection:', {
          type: clipboardData.type,
          length: analysis.contentLength,
          source: context.source_app,
          window: context.source_window_title?.substring(0, 50) + (context.source_window_title?.length > 50 ? '...' : ''),
          url: context.source_url || 'N/A',
          formats: analysis.formatCount,
          displays: clipboardData.context.allDisplays?.length || 0,
          preview: currentText.substring(0, 50) + '...'
        });
      } catch (error) {
        console.error('Failed to save clipboard content:', error.message);
      }
    }
  }, 1000);
}

// Content type detection moved to shared utils

// IPC handlers for renderer processes
ipcMain.on('hide-quick-access', () => {
  if (quickAccessWindow) {
    quickAccessWindow.hide();
  }
});

app.whenReady().then(async () => {
  // Initialize get-windows before creating the window
  await initializeGetWindows();
  createWindows();
  createTray();
  
  // Register global shortcut Ctrl+Shift+V for quick access
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    showQuickAccess();
  });
  
  monitorClipboard();
  
  console.log('Smart Clip started with enhanced source context monitoring.');
  
  // Check if get-windows loaded successfully
  if (activeWindow) {
    console.log('✅ Source app detection enabled');
  } else {
    console.log('⚠️  Source app detection disabled (fallback mode)');
  }
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
