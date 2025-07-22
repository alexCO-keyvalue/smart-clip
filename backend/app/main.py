from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime
import uuid
from .services.categorization import categorize_content, get_title

app = FastAPI(title="Smart Clipboard API", version="1.0.0")

# Enable CORS for Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Electron app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for now (replace with database later)
clipboard_entries = []

class ClipboardEntry(BaseModel):
    id: Optional[str] = None
    content: str
    type: Optional[str] = None  # Auto-generated, not required in input
    source_app: Optional[str] = None
    tags: List[str] = []
    timestamp: Optional[datetime.datetime] = None
    title: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Smart Clipboard API is running"}

@app.post("/api/clipboard", response_model=ClipboardEntry)
async def store_clipboard_entry(entry: ClipboardEntry):
    entry.id = str(uuid.uuid4())
    entry.timestamp = datetime.datetime.now()
    
    # Auto-categorize content using ML model
    entry.tags.append(categorize_content(entry.content))
    entry.title = get_title(entry.content)
    clipboard_entries.append(entry)
    return entry

@app.get("/api/clipboard", response_model=List[ClipboardEntry])
async def get_clipboard_entries(limit: int = 50):
    return sorted(clipboard_entries, key=lambda x: x.timestamp, reverse=True)[:limit]

@app.get("/api/clipboard/search")
async def search_clipboard_entries(q: str, limit: int = 20):
    results = []
    query = q.lower()
    
    for entry in clipboard_entries:
        if (query in entry.content.lower() or 
            any(query in tag.lower() for tag in entry.tags) or
            query in entry.type.lower()):
            results.append(entry)
    
    return sorted(results, key=lambda x: x.timestamp, reverse=True)[:limit]

@app.delete("/api/clipboard/{entry_id}")
async def delete_clipboard_entry(entry_id: str):
    global clipboard_entries
    clipboard_entries = [e for e in clipboard_entries if e.id != entry_id]
    return {"message": "Entry deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
