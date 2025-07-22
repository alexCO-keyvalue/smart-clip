// Utility functions for clipboard management

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format timestamp to human readable format
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

// Detect content type based on content
function detectContentType(content) {
  if (content.match(/^https?:\/\//)) {
    return 'url';
  }
  if (content.match(/(def |function |class |import |const |let |var )/)) {
    return 'code';
  }
  if (content.match(/\.(jpg|jpeg|png|gif|bmp|svg)$/i)) {
    return 'image';
  }
  return 'text';
}

// Truncate text to specified length
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Get type-specific icon
function getTypeIcon(type) {
  const icons = {
    text: '📄',
    url: '🔗',
    code: '💻',
    image: '🖼️'
  };
  return icons[type] || '📄';
}

// Hide current window (cross-platform)
function hideCurrentWindow() {
  const { remote, ipcRenderer } = require('electron');
  
  if (remote) {
    const currentWindow = remote.getCurrentWindow();
    currentWindow.hide();
  } else if (ipcRenderer) {
    ipcRenderer.send('hide-quick-access');
  }
}

module.exports = {
  escapeHtml,
  formatTime,
  detectContentType,
  truncateText,
  getTypeIcon,
  hideCurrentWindow
}; 