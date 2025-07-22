const { clipboard, ipcRenderer } = require('electron');
const ApiClient = require('./shared/api-client');
const { escapeHtml, formatTime, hideCurrentWindow } = require('./shared/utils');

const apiClient = new ApiClient();
let clipboardEntries = [];

// Load clipboard history
async function loadClipboardHistory() {
    try {
        clipboardEntries = await apiClient.getClipboardHistory();
        renderClipboardList(clipboardEntries);
    } catch (error) {
        console.error('Failed to load clipboard history:', error);
        document.getElementById('clipboardList').innerHTML = 
            '<div class="no-items">Failed to connect to backend.<br>Make sure the FastAPI server is running.</div>';
    }
}

// Render clipboard list
function renderClipboardList(entries) {
    const listElement = document.getElementById('clipboardList');
    
    if (entries.length === 0) {
        listElement.innerHTML = '<div class="no-items">No clipboard entries found.</div>';
        return;
    }
    
    listElement.innerHTML = entries.map(entry => `
        <div class="clipboard-item" onclick="selectClipboardItem('${entry.id}', '${escapeHtml(entry.content)}')">
            <div class="item-content">${escapeHtml(entry.content)}</div>
            <div class="item-meta">
                <div>
                    <span class="item-type">${entry.type}</span>
                    <span class="item-tags">
                        ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </span>
                </div>
                <div>${formatTime(entry.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

// Select clipboard item and copy to clipboard
function selectClipboardItem(id, content) {
    clipboard.writeText(content);
    console.log('Copied to clipboard:', content.substring(0, 50) + '...');
    
    // Hide window after selection
    hideCurrentWindow();
}

// Search functionality
document.getElementById('searchBox').addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    
    if (query === '') {
        renderClipboardList(clipboardEntries);
        return;
    }
    
    try {
        const results = await apiClient.searchClipboard(query);
        renderClipboardList(results);
    } catch (error) {
        console.error('Search failed:', error);
    }
});

// Utility functions moved to shared/utils.js

// Load data when window opens
window.addEventListener('DOMContentLoaded', () => {
    loadClipboardHistory();
    
    // Refresh every 5 seconds
    setInterval(loadClipboardHistory, 5000);
});

// Listen for refresh requests from main process
if (ipcRenderer) {
    ipcRenderer.on('refresh-data', () => {
        loadClipboardHistory();
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideCurrentWindow();
    }
}); 