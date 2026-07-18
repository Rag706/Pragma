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

## Pages

### Dashboard
The home screen. Shows at a glance:
- **Greeting header** — Good morning/afternoon/evening with today's date
- **Alert pill** — Overdue or due-today count across all projects (hidden when nothing urgent)
- **Project filter chips** — click to narrow all sections to one project
- **Overdue** and **Due Today** task sections (left column)
- **In Progress** and **Up Next** task sections (right column)
- **Project health cards** — progress bar, overdue/today counts, click to go to that project's tasks

### Today
Cross-project daily view. Sections:
- 期限切れ (Overdue) — red
- 本日期限 (Due Today) — yellow
- 今日のリマインダー (Today's Reminders) — orange
- 3日以内の期限 (Due within 3 days) — zinc

Right panel shows a 7-day week calendar with colored project dots per day, plus project health cards.

### All Tasks
Your main working view.

| Action | How |
|--------|-----|
| Add a task | Press **N**, click **"Add task"**, or use the **＋ button** (bottom-right of screen) |
| Open a task | Click any row — detail panel opens on the right |
| Preview a task | Hover over a task title for 0.4 s — shows status, priority, due date and notes |
| Edit a task | Make changes in the detail panel — saves automatically |
| Change status (quick) | Click the status icon on the left of any row |
| Delete a task | Hover a row → click the **✕** icon on the right |
| Filter | Use the dropdowns: Project / Status / Priority / Due Date |
| Search | Type in the search box (debounced — updates as you type) |
| Clear all filters | Click **"Clear filters"** next to the title |
| Jump to a project | Click the project name in the left sidebar |

Keyboard shortcut: **N** to open quick-add, **Escape** to cancel.

### Projects
Manage your projects and activity buckets.

| Action | How |
|--------|-----|
| Add a project | Click **"New Project"** (top right) |
| Edit a project | Click the pencil icon on a project card |
| Archive a project | Click the trash icon on a project card |
| View tasks for a project | Click **"View Tasks"** or click the project name in the sidebar |
| Add project notes/pages | Switch to the **Notes** tab inside any project |
| View activity log | Switch to the **Activity** tab inside any project |

### Kanban
Drag-and-drop board view of tasks, grouped by status.

### Time Log
Per-project time tracking. Start/stop a timer to log hours against a task or project.

### Settings
Configure default task status, default priority, sort order, and theme.

---

## Floating Add Button (＋)

The indigo **＋** button fixed at the bottom-right of every page lets you add tasks from anywhere:

- **クイック追加** — Opens a mini form (title + project + due date + priority)
- **今日期限で追加** — Same form with today's date pre-filled
- **[Project name] に追加** — Only appears when viewing a project's task list; pre-fills that project

Tasks created via the floating button appear instantly in the task list.

---

## Reminder Bell

The bell icon (top-right) shows tasks that need attention:
- **Due Today / Overdue** section — red
- **Reminders** section — amber (tasks with a `remind_at` date of today or earlier)

Bell color: red if any tasks are due/overdue, amber if only reminders, zinc if nothing urgent.

---

## Task Fields

| Field | Notes |
|-------|-------|
| Title | Free text, required |
| Project | Which project this belongs to |
| Priority | High / Medium / Low |
| Status | See status table below |
| Due Date | Date picker — overdue tasks flagged in red throughout the app |
| Start Date | Optional |
| Notes | Personal progress notes (shown in hover preview) |
| Details | Background info / manager instructions (added by Claude or you) |
| Remind At | Date for a reminder (shown in bell icon and Today page) |

### Status Values

| Status | Meaning |
|--------|---------|
| To Do | Ready to start, not yet begun |
| Up Next | Starting very soon |
| In Progress | Actively being worked on |
| Review | Waiting for review or approval |
| Testing | In QA or testing phase |
| Waiting | Blocked, waiting on someone else |
| On Hold | Paused intentionally |
| Done | Completed |
| Cancelled | No longer needed |

---

## Sidebar

- **Today** nav item shows a red badge with global overdue count (pulses when non-zero)
- **Project links** show a red badge (overdue count), yellow badge (due today count), or ✓ (all clear)
- Sidebar can be collapsed to icon-only mode with the chevron button

---

## Claude AI Integration (MCP)

TaskFlow includes an MCP server that connects Claude Code to your task data.

See [CLAUDE.md](./CLAUDE.md) for full instructions on how to use Claude to query, create, and update tasks through natural conversation.

To start the MCP server:
```bash
cd backend
python mcp_server.py
```

---

## Resetting Data

To wipe all tasks:
1. Go to **All Tasks** → click **"Delete all"** in the header

To reset everything to a blank slate:
1. Stop the backend
2. Delete `backend/taskflow.db`
3. Restart — the database is recreated empty
4. Run `python seed.py` to reload sample data

---

## File Structure

```
014_todo_application/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # SQLite connection
│   ├── seed.py              # Sample data loader
│   ├── mcp_server.py        # MCP server for Claude AI integration
│   ├── taskflow.db          # SQLite database (auto-created on first run)
│   └── routers/
│       ├── tasks.py         # Task CRUD endpoints
│       ├── projects.py      # Project CRUD endpoints
│       ├── stats.py         # Dashboard stats endpoint
│       ├── notes.py         # Project notes/pages endpoints
│       └── project_logs.py  # Project activity log endpoints
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx    # Greeting + project health overview
│       │   ├── Tasks.jsx        # Main task list with detail panel
│       │   ├── Today.jsx        # Cross-project daily view
│       │   ├── Projects.jsx     # Project management
│       │   ├── Kanban.jsx       # Drag-and-drop board
│       │   ├── TimeLog.jsx      # Time tracking
│       │   └── Settings.jsx     # App settings
│       ├── components/
│       │   ├── Layout.jsx           # App shell (sidebar + outlet)
│       │   ├── Sidebar.jsx          # Navigation + project links + badges
│       │   ├── TaskDrawer.jsx       # Task detail/edit panel
│       │   ├── QuickAdd.jsx         # Inline task creation form
│       │   ├── FloatingAddButton.jsx # Floating ＋ button (all pages)
│       │   ├── ReminderBell.jsx     # Bell icon with due/reminder dropdown
│       │   ├── Badge.jsx            # Status/priority badge components
│       │   └── RichTextEditor.jsx   # Notes editor
│       ├── api/             # API client functions (tasks, projects, notes, etc.)
│       └── context/         # React context (Theme, Timer, Toast, Settings)
├── setup.bat                # First-time setup
├── start.bat                # Daily launcher
├── CLAUDE.md                # AI assistant rules for Claude Code
└── README.md                # This file
```

---

## API Reference

Interactive API docs: **http://localhost:59080/docs** (while the backend is running).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (supports filters) |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/{id}` | Update a task |
| PATCH | `/api/tasks/{id}/status` | Quick status update |
| DELETE | `/api/tasks/{id}` | Delete a task |
| DELETE | `/api/tasks/all` | Delete all tasks |
| POST | `/api/tasks/{id}/logs` | Add an activity log entry |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create a project |
| PUT | `/api/projects/{id}` | Update a project |
| DELETE | `/api/projects/{id}` | Archive a project |
| GET | `/api/projects/{id}/logs` | List project activity log |
| POST | `/api/projects/{id}/logs` | Add a project log entry |
| GET | `/api/stats` | Dashboard stats |
