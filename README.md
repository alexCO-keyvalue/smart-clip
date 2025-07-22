# Smart Clip - Intelligent Clipboard Manager

A powerful desktop clipboard manager with smart tagging and search capabilities. Built with Electron (frontend) and FastAPI (backend).

## Features

- **🔄 Background Clipboard Monitoring**: Automatically captures all clipboard changes
- **🔍 Smart Search**: Search through your clipboard history with intelligent filtering
- **🏷️ Auto-Tagging**: Automatically categorizes content (text, code, URLs, etc.)
- **⚡ Quick Access**: Global shortcut `Ctrl+Shift+V` to open clipboard history
- **💾 Persistent Storage**: All clipboard entries are stored locally via FastAPI backend
- **🎨 Modern UI**: Beautiful floating window with dark theme
- **📱 System Tray**: Runs quietly in the background with tray icon access

## Architecture

- **Frontend**: Electron.js desktop app with modern HTML/CSS/JavaScript
- **Backend**: FastAPI (Python) REST API for data storage and search
- **Storage**: In-memory storage (easily extensible to SQLite/PostgreSQL)
- **Communication**: HTTP REST API between frontend and backend

## Prerequisites

- **Python 3.7+** (for backend)
- **Node.js 16+** (for frontend)
- **npm or yarn** (package manager)

## Quick Start

### 1. Install Dependencies

```bash
./scripts/install.sh
```

### 2. Run Development Mode

```bash
./scripts/dev.sh
```

This will start both:
- FastAPI backend server on `http://127.0.0.1:8000`
- Electron desktop app

### 3. Usage

- The app runs in the background with a system tray icon
- Copy any text, and it's automatically saved to your clipboard history
- Press `Ctrl+Shift+V` to open the floating clipboard history window
- Click any item to copy it back to your clipboard
- Use the search box to find specific clipboard entries
- Press `Escape` to close the history window

## Manual Setup

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

The backend exposes these REST endpoints:

- `GET /` - Health check
- `POST /api/clipboard` - Store new clipboard entry
- `GET /api/clipboard` - Get all clipboard entries (latest first)
- `GET /api/clipboard/search?q={query}` - Search clipboard entries
- `DELETE /api/clipboard/{id}` - Delete specific entry

## Project Structure

```
smart-clip/
├── frontend/           # Electron desktop app
│   ├── src/
│   │   ├── main.js    # Main Electron process
│   │   └── components/ # UI components
│   ├── public/        # Static assets
│   └── package.json   # Node.js dependencies
├── backend/           # FastAPI Python server  
│   ├── app/
│   │   ├── main.py    # FastAPI app
│   │   ├── api/       # REST endpoints
│   │   ├── models/    # Data models
│   │   └── services/  # Business logic
│   └── requirements.txt
├── scripts/           # Development scripts
└── docs/             # Documentation
```

## Development

### Backend Development

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Visit `http://127.0.0.1:8000/docs` for interactive API documentation.

### Frontend Development

```bash
cd frontend
npm run dev
```

### Building for Production

```bash
cd frontend
npm run build
```

## Keyboard Shortcuts

- `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) - Open clipboard history
- `Escape` - Close clipboard history window
- `Ctrl+C` (in terminal) - Stop development servers

## Customization

### Auto-Tagging Logic

Edit `backend/app/main.py` to customize how content is automatically tagged:

```python
# Basic auto-tagging logic
if entry.type == "text":
    if "http" in entry.content.lower():
        entry.tags.append("url")
    if any(keyword in entry.content.lower() for keyword in ["def ", "function", "class "]):
        entry.tags.append("code")
```

### UI Styling

Modify `frontend/public/index.html` to customize the appearance of the clipboard history window.

## Troubleshooting

### Backend not starting
- Ensure Python 3.7+ is installed
- Check if port 8000 is available
- Install dependencies: `pip install -r backend/requirements.txt`

### Frontend not starting  
- Ensure Node.js 16+ is installed
- Install dependencies: `npm install` in frontend directory
- Check for Electron compatibility with your OS

### Clipboard not being monitored
- Ensure both backend and frontend are running
- Check console logs for connection errors
- Verify the backend API is accessible at `http://127.0.0.1:8000`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] SQLite database integration
- [ ] Image clipboard support
- [ ] Cloud sync capabilities
- [ ] Advanced AI-powered tagging
- [ ] Custom keyboard shortcuts
- [ ] Export/import functionality
- [ ] Multiple clipboard profiles
