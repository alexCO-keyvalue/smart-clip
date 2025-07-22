from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime
import uuid
import json

# Custom JSON encoder to handle datetime and other objects
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if hasattr(obj, 'dict'):  # Pydantic v1
            return obj.dict()
        if hasattr(obj, 'model_dump'):  # Pydantic v2
            return obj.model_dump()
        return super().default(obj)

app = FastAPI(title="Smart Clipboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clipboard_entries = []

class ClipboardContent(BaseModel):
    text: str
    html: Optional[str] = ""
    rtf: Optional[str] = ""
    hasImage: Optional[bool] = False
    bookmark: Optional[Dict[str, str]] = None
    availableFormats: Optional[List[str]] = []
    error: Optional[str] = None
    
    def to_json_dict(self):
        """Convert to JSON-serializable dictionary"""
        return self.model_dump() if hasattr(self, 'model_dump') else self.dict()

class ContentAnalysis(BaseModel):
    contentLength: int
    wordCount: int
    lineCount: int
    hasFormatting: bool
    formatCount: int
    
    def to_json_dict(self):
        """Convert to JSON-serializable dictionary"""
        return self.model_dump() if hasattr(self, 'model_dump') else self.dict()

class SourceContext(BaseModel):
    platform: str
    timestamp: str
    cursorPosition: Optional[Dict[str, float]] = None
    
    # App version information
    appName: Optional[str] = None
    appVersion: Optional[str] = None
    electronVersion: Optional[str] = None
    chromeVersion: Optional[str] = None
    nodeVersion: Optional[str] = None
    
    # Display hardware details
    primaryDisplay: Optional[Dict[str, Any]] = None
    allDisplays: Optional[List[Dict[str, Any]]] = None
    
    # Enhanced source application detection
    source_app: Optional[str] = None
    source_window_title: Optional[str] = None
    source_bundle_id: Optional[str] = None  # macOS only
    source_process_id: Optional[int] = None
    source_window_bounds: Optional[Dict[str, Any]] = None
    source_executable_path: Optional[str] = None
    source_memory_usage: Optional[int] = None
    source_url: Optional[str] = None  # Browser URLs on macOS
    
    def to_json_dict(self):
        """Convert to JSON-serializable dictionary"""
        return self.model_dump() if hasattr(self, 'model_dump') else self.dict()

class ClipboardEntry(BaseModel):
    id: Optional[str] = None
    content: ClipboardContent
    type: str
    analysis: ContentAnalysis
    context: SourceContext
    tags: List[str] = []
    timestamp: Optional[datetime.datetime] = None
    
    def to_json_dict(self):
        """Convert to JSON-serializable dictionary"""
        data = self.model_dump() if hasattr(self, 'model_dump') else self.dict()
        # Ensure timestamp is properly serialized
        if data.get('timestamp') and isinstance(data['timestamp'], datetime.datetime):
            data['timestamp'] = data['timestamp'].isoformat()
        return data

@app.post("/api/clipboard", response_model=ClipboardEntry)
async def store_clipboard_entry(entry: ClipboardEntry):
    entry.id = str(uuid.uuid4())
    entry.timestamp = datetime.datetime.now()
    # print(f"DB_ Received clipboard entry: {json.dumps(entry.to_json_dict(), cls=CustomJSONEncoder)}")
    
    # Enhanced source-focused tagging
    text_content = entry.content.text or ""
    source_app = entry.context.source_app or "unknown"
    
    # Detect likely source applications based on content AND detected app
    if entry.type == "code":
        if "def " in text_content or "import " in text_content:
            entry.tags.append("python-editor")
        elif "function " in text_content:
            entry.tags.append("javascript-editor")
        elif "#include" in text_content or "int main" in text_content:
            entry.tags.append("c-editor")
        entry.tags.append("ide")
    
    elif entry.type == "url" or entry.content.bookmark:
        entry.tags.append("browser")
        
    elif entry.type == "rich_text" and entry.content.html:
        entry.tags.append("web-page")
        
    elif entry.type == "file_path":
        entry.tags.append("file-manager")
        
    elif entry.type == "image":
        entry.tags.append("screenshot-tool")
    
    elif entry.type == "json":
        entry.tags.append("api-tool")
    
    # Enhanced app-specific tagging based on detected source
    if source_app and source_app != "unknown" and source_app != "detection-failed":
        app_name_lower = source_app.lower()
        
        # Browser detection
        if any(browser in app_name_lower for browser in ['chrome', 'safari', 'firefox', 'edge']):
            entry.tags.extend(['browser-detected', 'web-source'])
            if entry.context.source_url:
                entry.tags.append('has-url')
        
        # Code editor detection
        elif any(editor in app_name_lower for editor in ['code', 'sublime', 'atom', 'vim', 'emacs']):
            entry.tags.extend(['code-editor-detected', 'development-source'])
        
        # Office/Document apps
        elif any(office in app_name_lower for office in ['word', 'pages', 'docs']):
            entry.tags.extend(['document-app-detected', 'office-source'])
        
        # Communication apps
        elif any(comm in app_name_lower for comm in ['slack', 'discord', 'teams']):
            entry.tags.extend(['communication-app-detected', 'work-source'])
        
        # Design/Creative apps
        elif any(design in app_name_lower for design in ['photoshop', 'sketch', 'figma']):
            entry.tags.extend(['design-app-detected', 'creative-source'])
        
        # Terminal/Command line
        elif any(terminal in app_name_lower for terminal in ['terminal', 'iterm', 'cmd']):
            entry.tags.extend(['terminal-detected', 'command-line-source'])
    
    # Content analysis based tagging (existing logic)
    if entry.analysis.contentLength > 1000:
        entry.tags.append("large-content")
    if entry.analysis.hasFormatting:
        entry.tags.append("formatted")
    if entry.analysis.formatCount > 3:
        entry.tags.append("rich-media")
    
    # Platform and display context
    entry.tags.append(f"from-{entry.context.platform}")
    if entry.context.allDisplays and len(entry.context.allDisplays) > 1:
        entry.tags.append("multi-monitor")
    
    # App version context
    if entry.context.appVersion:
        entry.tags.append(f"app-v{entry.context.appVersion}")
    
    clipboard_entries.append(entry)
    
    # Enhanced logging with source information
    source_info = f"{source_app}"
    if entry.context.source_window_title:
        source_info += f" ({entry.context.source_window_title[:30]}...)"
    if entry.context.source_url:
        source_info += f" | URL: {entry.context.source_url[:50]}..."
    
    print(f"Stored clipboard: {entry.type} | {entry.analysis.contentLength}chars | {source_info} | {len(entry.context.allDisplays or [])} displays")
    return entry

@app.get("/api/clipboard", response_model=List[ClipboardEntry])
async def get_clipboard_entries(limit: int = 50):
    return sorted(clipboard_entries, key=lambda x: x.timestamp, reverse=True)[:limit]

@app.get("/api/clipboard/by-source")
async def get_entries_by_source(source: str = None):
    if source:
        results = [entry for entry in clipboard_entries if entry.context.source_app == source]
    else:
        # Group by source app
        sources = {}
        for entry in clipboard_entries:
            src = entry.context.source_app or 'unknown'
            if src not in sources:
                sources[src] = []
            sources[src].append(entry)
        return sources
    
    return sorted(results, key=lambda x: x.timestamp, reverse=True)

@app.get("/api/clipboard/stats")
async def get_clipboard_stats():
    if not clipboard_entries:
        return {"message": "No clipboard entries yet"}
    
    # Enhanced statistics including app versions and display info
    total_entries = len(clipboard_entries)
    types_count = {}
    tags_count = {}
    platforms = set()
    app_versions = set()
    display_counts = {}
    
    total_chars = 0
    total_words = 0
    total_formats = 0
    
    for entry in clipboard_entries:
        # Count types
        types_count[entry.type] = types_count.get(entry.type, 0) + 1
        
        # Count tags
        for tag in entry.tags:
            tags_count[tag] = tags_count.get(tag, 0) + 1
        
        # Track platforms and app versions
        if entry.context.platform:
            platforms.add(entry.context.platform)
        if entry.context.appVersion:
            app_versions.add(f"{entry.context.appName}-{entry.context.appVersion}")
        
        # Display statistics
        display_count = len(entry.context.allDisplays or [])
        display_counts[display_count] = display_counts.get(display_count, 0) + 1
        
        # Content statistics
        total_chars += entry.analysis.contentLength
        total_words += entry.analysis.wordCount
        total_formats += entry.analysis.formatCount
    
    return {
        "total_entries": total_entries,
        "content_stats": {
            "total_characters": total_chars,
            "total_words": total_words,
            "total_formats": total_formats,
            "average_content_length": total_chars / total_entries if total_entries > 0 else 0,
            "average_formats_per_entry": total_formats / total_entries if total_entries > 0 else 0
        },
        "content_types": types_count,
        "popular_tags": dict(sorted(tags_count.items(), key=lambda x: x[1], reverse=True)[:10]),
        "platforms_used": list(platforms),
        "app_versions": list(app_versions),
        "display_configurations": display_counts
    }

@app.get("/api/clipboard/search")
async def search_clipboard_entries(q: str, limit: int = 20):
    results = []
    query = q.lower()
    
    for entry in clipboard_entries:
        if (query in (entry.content.text or "").lower() or
            query in (entry.content.html or "").lower() or
            any(query in tag.lower() for tag in entry.tags) or
            query in entry.type.lower() or
            query in (entry.context.source_app or "").lower() or
            query in (entry.context.appName or "").lower()):
            results.append(entry)
    
    return sorted(results, key=lambda x: x.timestamp, reverse=True)[:limit]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
