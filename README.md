# TaskFlow — Local Task Manager

A fast, dark-mode task management app built with React + FastAPI + SQLite.
Runs entirely on your machine — no cloud, no login, no subscriptions.

---

## Requirements

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |

---

## First-Time Setup

Run **once** after cloning or downloading the project:

```
Double-click: setup.bat
```

This installs Python dependencies, Node dependencies, and seeds the database with sample data.

---

## Daily Use

```
Double-click: start.bat
```

Opens two terminal windows (backend + frontend) and launches the browser automatically.

| Service  | URL                         |
|----------|-----------------------------|
| App      | http://localhost:5173       |
| API docs | http://localhost:59080/docs |

To stop: close both terminal windows.

---

## Manual Start (if start.bat doesn't work)

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --port 59080
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## Usage Guide

### Dashboard
The home screen. Shows at a glance:
- **KPI cards** — Total tasks, Due Today, Overdue, Done This Week
- **Project Progress** — completion bar per project
- **Status Overview** — breakdown of In Progress / To Do / Done / On Hold
- **Due This Week** — upcoming tasks sorted by due date

### All Tasks
Your main working view.

| Action | How |
|--------|-----|
| Add a task | Press **N** anywhere, or click **"Add task"** at the top of the list |
| Open a task | Click any row — detail panel slides in from the right |
| Edit a task | Make changes in the detail panel — saves automatically |
| Change status (quick) | Click the status icon on the left of any row to cycle it |
| Delete a task | Hover a row → click the **✕** icon on the right |
| Delete all tasks | Click **"Delete all"** in the top-right header (asks for confirmation) |
| Filter | Use the dropdowns: Project / Status / Priority / Due Date |
| Search | Type in the search box (debounced — updates as you type) |
| Clear all filters | Click **"Clear filters"** next to the title |
| Jump to a project | Click the project name in the left sidebar |

**Keyboard shortcut:** Press **N** while on the Tasks page to open the quick-add form. Press **Escape** to cancel.

### Projects
Manage your projects and activity buckets.

| Action | How |
|--------|-----|
| Add a project | Click **"New Project"** (top right) |
| Edit a project | Click the **pencil icon** on a project card |
| Archive a project | Click the **trash icon** on a project card (archived projects disappear from the sidebar and filters but data is kept) |
| View tasks for a project | Click **"View Tasks"** on a project card, or click the project name in the sidebar |

**Project types:**
- **Project** — time-bounded work (e.g. a client engagement, a game feature)
- **Activity** — ongoing recurring work (e.g. Admin, Personal)

### Task Fields

| Field | Notes |
|-------|-------|
| Title | Free text, required |
| Project | Which project this belongs to |
| Priority | High / Medium / Low |
| Status | To Do → In Progress → Done → On Hold |
| Due Date | Date picker — overdue tasks show in red |
| Start Date | Optional |
| Notes | Free text notes for the task |

---

## Resetting Sample Data

To wipe all tasks and start fresh:
1. Go to **All Tasks** → click **"Delete all"** in the header
2. Or delete individual tasks by hovering a row and clicking ✕

To reset everything (including projects) to a blank slate:
1. Stop the backend
2. Delete `backend/taskflow.db`
3. Restart — the database is recreated empty on next launch
4. Re-run `python seed.py` if you want the sample data back

---

## File Structure

```
014_todo_application/
├── backend/
│   ├── main.py            # FastAPI app entry point
│   ├── models.py          # Database models (SQLAlchemy)
│   ├── schemas.py         # Request/response validation (Pydantic)
│   ├── database.py        # SQLite connection
│   ├── seed.py            # Sample data loader
│   ├── mcp_server.py      # MCP server for Claude AI integration
│   ├── taskflow.db        # SQLite database (auto-created on first run)
│   └── routers/
│       ├── tasks.py       # Task CRUD endpoints
│       ├── projects.py    # Project CRUD endpoints
│       ├── stats.py       # Dashboard stats endpoint
│       ├── notes.py       # Project notes/pages endpoints
│       └── project_logs.py # Project activity log endpoints
├── frontend/
│   └── src/
│       ├── pages/         # Dashboard, Tasks, Projects, Kanban, TimeLog
│       ├── components/    # Sidebar, TaskDrawer, QuickAdd, RichTextEditor, etc.
│       ├── api/           # API client functions
│       └── context/       # React context (Theme, Timer, Toast, Settings)
├── setup.bat              # First-time setup (run once after cloning)
├── start.bat              # Daily launcher
└── CLAUDE.md              # AI assistant instructions for Claude Code
```

---

## API Reference

Interactive API docs are available at **http://localhost:59080/docs** while the backend is running.
All endpoints are under `/api/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (supports filters) |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/{id}` | Update a task |
| PATCH | `/api/tasks/{id}/status` | Quick status update |
| DELETE | `/api/tasks/{id}` | Delete a task |
| DELETE | `/api/tasks/all` | Delete all tasks (optional `?project_id=`) |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create a project |
| PUT | `/api/projects/{id}` | Update a project |
| DELETE | `/api/projects/{id}` | Archive a project |
| GET | `/api/stats` | Dashboard stats |
