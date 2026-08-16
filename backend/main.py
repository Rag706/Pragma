from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import models
from database import engine
from routers import tasks, projects, stats, task_logs, tags, references, task_links, checklist, notes, project_logs

models.Base.metadata.create_all(bind=engine)

with engine.connect() as _conn:
    for ddl in [
        "ALTER TABLE time_entries ADD COLUMN start_time VARCHAR(5)",
        "ALTER TABLE time_entries ADD COLUMN is_break BOOLEAN DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN status_note VARCHAR(200) DEFAULT ''",
        "ALTER TABLE tasks ADD COLUMN is_focus BOOLEAN DEFAULT 0 NOT NULL",
        "ALTER TABLE tasks ADD COLUMN rank INTEGER DEFAULT NULL",
        "UPDATE tasks SET rank = 1 WHERE is_focus = 1 AND rank IS NULL",
        "CREATE TABLE IF NOT EXISTS task_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, name VARCHAR(50) NOT NULL, color VARCHAR(7) DEFAULT '#6366F1', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS task_tags (task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (task_id, tag_id))",
        "CREATE TABLE IF NOT EXISTS project_references (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title VARCHAR(200) NOT NULL, url VARCHAR(500) DEFAULT '', notes TEXT DEFAULT '', ref_type VARCHAR(10) DEFAULT 'url', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS task_links (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title VARCHAR(200) NOT NULL, url VARCHAR(500) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS checklist_items (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title VARCHAR(500) NOT NULL, checked BOOLEAN NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS project_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title VARCHAR(200) NOT NULL DEFAULT '', body TEXT DEFAULT '', color VARCHAR(20) DEFAULT '#a1a1aa', position INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "ALTER TABLE project_notes ADD COLUMN position INTEGER DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN details TEXT DEFAULT ''",
        "CREATE TABLE IF NOT EXISTS project_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, content TEXT NOT NULL, author VARCHAR(20) DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    ]:
        try:
            _conn.execute(text(ddl))
            _conn.commit()
        except Exception:
            pass

app = FastAPI(title="TaskFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(stats.router)
app.include_router(task_logs.router)
app.include_router(tags.router)
app.include_router(references.router)
app.include_router(task_links.router)
app.include_router(checklist.router)
app.include_router(notes.router)
app.include_router(project_logs.router)

@app.get("/")
def health():
    return {"status": "ok", "app": "TaskFlow"}

@app.get("/api/health")
def api_health():
    return {"status": "ok"}
