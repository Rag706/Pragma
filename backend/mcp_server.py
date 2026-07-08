"""
TaskFlow MCP Server
Exposes the TaskFlow API as tools for Claude Code assistant sessions.
Run via Claude Code's MCP integration — do not run directly.
"""
from mcp.server.fastmcp import FastMCP
import httpx
from datetime import date

BASE = "http://localhost:59080/api"
mcp = FastMCP("TaskFlow")


def _get(path: str, params: dict = None) -> dict | list:
    try:
        r = httpx.get(f"{BASE}{path}", params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        raise RuntimeError("Cannot reach TaskFlow backend at localhost:59080 — is it running?")


def _post(path: str, body: dict) -> dict:
    try:
        r = httpx.post(f"{BASE}{path}", json=body, timeout=10)
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        raise RuntimeError("Cannot reach TaskFlow backend at localhost:59080 — is it running?")


def _put(path: str, body: dict) -> dict:
    try:
        r = httpx.put(f"{BASE}{path}", json=body, timeout=10)
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        raise RuntimeError("Cannot reach TaskFlow backend at localhost:59080 — is it running?")


def _delete(path: str) -> None:
    try:
        r = httpx.delete(f"{BASE}{path}", timeout=10)
        r.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError("Cannot reach TaskFlow backend at localhost:59080 — is it running?")


def _fmt_due(due: str | None) -> str:
    if not due:
        return "no due date"
    today = date.today().isoformat()
    if due < today:
        return f"{due} (OVERDUE)"
    if due == today:
        return f"{due} (TODAY)"
    return due


# ── Projects ──────────────────────────────────────────────────────


@mcp.tool()
def list_projects() -> str:
    """List all active projects with their IDs, names, and types."""
    projects = _get("/projects")
    if not projects:
        return "No projects found."
    lines = ["Active projects:"]
    for p in projects:
        lines.append(f"  ID={p['id']} | {p['name']} | type={p['type']}")
    return "\n".join(lines)


@mcp.tool()
def get_project_summary(project_id: int) -> str:
    """
    Get a full overview of a project: task counts by status, recent activity log entries,
    and any overdue or high-priority items. Always call this before processing a manager
    message or making bulk changes to a project.
    """
    # Tasks for this project
    tasks = _get("/tasks", {"project_id": project_id})
    projects = _get("/projects")
    proj = next((p for p in projects if p["id"] == project_id), None)
    if not proj:
        return f"Project ID={project_id} not found."

    # Status counts
    status_counts: dict[str, int] = {}
    overdue = []
    high_priority = []
    today = date.today().isoformat()
    for t in tasks:
        status_counts[t["status"]] = status_counts.get(t["status"], 0) + 1
        if t.get("due_date") and t["due_date"] < today and t["status"] not in ("done", "cancelled"):
            overdue.append(t)
        if t["priority"] == "high" and t["status"] not in ("done", "cancelled"):
            high_priority.append(t)

    lines = [
        f"Project: {proj['name']} (ID={project_id}, type={proj['type']})",
        f"Total tasks: {len(tasks)}",
        "",
        "Status breakdown:",
    ]
    for status, count in sorted(status_counts.items()):
        lines.append(f"  {status}: {count}")

    if overdue:
        lines.append(f"\nOverdue tasks ({len(overdue)}):")
        for t in overdue[:5]:
            lines.append(f"  ID={t['id']} | {t['title']} | due={t['due_date']}")
        if len(overdue) > 5:
            lines.append(f"  ... and {len(overdue) - 5} more")

    if high_priority:
        lines.append(f"\nHigh-priority active tasks ({len(high_priority)}):")
        for t in high_priority[:5]:
            lines.append(f"  ID={t['id']} | {t['title']} | status={t['status']}")

    # Recent project logs
    logs = _get(f"/projects/{project_id}/logs", {"limit": 10})
    if logs:
        lines.append(f"\nRecent activity ({len(logs)} shown):")
        for log in logs:
            author = "Claude" if log["author"] == "claude" else "You"
            ts = log["created_at"][:10]
            lines.append(f"  [{ts}] {author}: {log['content'][:120]}")
    else:
        lines.append("\nNo activity logged yet for this project.")

    return "\n".join(lines)


# ── Tasks ─────────────────────────────────────────────────────────


@mcp.tool()
def list_tasks(
    project_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    due_filter: str | None = None,
    search: str | None = None,
) -> str:
    """
    List tasks with optional filters.
    - due_filter options: today | tomorrow | week | overdue
    - status options: backlog | todo | up_next | planning | in_progress | review | testing | done | blocked | on_hold | waiting | cancelled
    - priority options: high | medium | low
    Returns task IDs needed for update_task and add_task_log.
    """
    params: dict = {}
    if project_id is not None:
        params["project_id"] = project_id
    if status:
        params["status"] = status
    if priority:
        params["priority"] = priority
    if due_filter:
        params["due_filter"] = due_filter
    if search:
        params["search"] = search

    tasks = _get("/tasks", params)
    today = date.today().isoformat()

    if not tasks:
        return f"No tasks found matching the given filters. (Today is {today})"

    lines = [f"Today is {today}. Found {len(tasks)} task(s):\n"]
    for t in tasks:
        due_str = _fmt_due(t.get("due_date"))
        proj_id = t.get("project_id") or "—"
        checklist = t.get("checklist_items", [])
        cl_str = ""
        if checklist:
            done = sum(1 for i in checklist if i["checked"])
            cl_str = f" | checklist={done}/{len(checklist)}"
        lines.append(
            f"ID={t['id']} | {t['title']}\n"
            f"  status={t['status']} | priority={t['priority']} | due={due_str} | project_id={proj_id}{cl_str}"
        )
    return "\n".join(lines)


@mcp.tool()
def get_task(task_id: int) -> str:
    """
    Get the full details of a specific task including notes, Claude Context (details field),
    checklist items, and recent activity log entries.
    Use this before updating a task to confirm you have the right one.
    """
    t = _get(f"/tasks/{task_id}")
    logs = _get(f"/tasks/{task_id}/logs")

    lines = [
        f"Task ID={t['id']}: {t['title']}",
        f"Status:   {t['status']}",
        f"Priority: {t['priority']}",
        f"Due:      {_fmt_due(t.get('due_date'))}",
        f"Start:    {t.get('start_date') or 'not set'}",
        f"Progress: {t.get('progress', 0)}%",
        f"Project:  {t.get('project_id') or 'none'}",
        f"Favorite: {'yes' if t.get('is_focus') else 'no'}",
        f"Created:  {t['created_at'][:10]}",
    ]

    if t.get("completed_at"):
        lines.append(f"Completed: {t['completed_at'][:10]}")

    if t.get("status_note"):
        lines.append(f"Status note: {t['status_note']}")

    notes = t.get("notes", "").strip()
    lines.append(f"\nNotes (user):\n{notes if notes else '(empty)'}")

    details = t.get("details", "").strip()
    lines.append(f"\nClaude Context:\n{details if details else '(empty)'}")

    checklist = t.get("checklist_items", [])
    if checklist:
        done = sum(1 for i in checklist if i["checked"])
        lines.append(f"\nChecklist ({done}/{len(checklist)} done):")
        for item in checklist:
            mark = "x" if item["checked"] else " "
            lines.append(f"  [{mark}] {item['title']}")

    tags = t.get("tags", [])
    if tags:
        lines.append(f"\nTags: {', '.join(tg['name'] for tg in tags)}")

    if logs:
        lines.append(f"\nActivity log ({len(logs)} entries):")
        for log in logs[:10]:
            lines.append(f"  [{log['created_at'][:10]}] {log['content']}")
        if len(logs) > 10:
            lines.append(f"  ... ({len(logs) - 10} older entries not shown)")
    else:
        lines.append("\nActivity log: (empty)")

    return "\n".join(lines)


@mcp.tool()
def create_task(
    title: str,
    project_id: int | None = None,
    priority: str = "medium",
    status: str = "todo",
    due_date: str | None = None,
    notes: str | None = None,
    details: str | None = None,
) -> str:
    """
    Create a new task.
    - priority: high | medium | low
    - status: backlog | todo | up_next | in_progress | etc.
    - due_date format: YYYY-MM-DD
    - notes: user-facing short summary
    - details: Claude Context — background and details for future reference

    IMPORTANT: Always confirm with the user before calling this. After creating,
    report the new task ID and details back to the user.
    """
    body: dict = {
        "title": title,
        "priority": priority,
        "status": status,
    }
    if project_id is not None:
        body["project_id"] = project_id
    if due_date:
        body["due_date"] = due_date
    if notes:
        body["notes"] = notes
    if details:
        body["details"] = details

    t = _post("/tasks", body)
    return (
        f"Created task ID={t['id']}: \"{t['title']}\"\n"
        f"  status={t['status']} | priority={t['priority']} | due={_fmt_due(t.get('due_date'))} | project_id={t.get('project_id') or 'none'}"
    )


@mcp.tool()
def update_task(
    task_id: int,
    title: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    due_date: str | None = None,
    notes: str | None = None,
    details: str | None = None,
    progress: int | None = None,
    is_focus: bool | None = None,
) -> str:
    """
    Update one or more fields on an existing task.
    Only provide the fields you want to change — others are left untouched.
    To clear due_date pass an empty string "".

    IMPORTANT: Always call get_task first to confirm the right task, then confirm
    the change with the user before calling this. Report before AND after the update.
    """
    body: dict = {}
    if title is not None:
        body["title"] = title
    if status is not None:
        body["status"] = status
    if priority is not None:
        body["priority"] = priority
    if due_date is not None:
        body["due_date"] = due_date if due_date else None
    if notes is not None:
        body["notes"] = notes
    if details is not None:
        body["details"] = details
    if progress is not None:
        body["progress"] = progress
    if is_focus is not None:
        body["is_focus"] = is_focus

    if not body:
        return "No fields provided — nothing was updated."

    t = _put(f"/tasks/{task_id}", body)
    changed = ", ".join(f"{k}={v!r}" for k, v in body.items())
    return (
        f"Updated task ID={t['id']}: \"{t['title']}\"\n"
        f"  Changes: {changed}\n"
        f"  Current: status={t['status']} | priority={t['priority']} | due={_fmt_due(t.get('due_date'))}"
    )


# ── Task logs ─────────────────────────────────────────────────────


@mcp.tool()
def add_task_log(task_id: int, content: str) -> str:
    """
    Add an activity log entry to a specific task.
    Use this to record any update, status change, or decision made about a task.
    Always call this when you update a task so the user can review the history later.
    """
    _post(f"/tasks/{task_id}/logs", {"content": content})
    return f"Log entry added to task ID={task_id}."


# ── Project logs ──────────────────────────────────────────────────


@mcp.tool()
def list_project_logs(project_id: int) -> str:
    """
    Get the full activity log for a project. Shows entries written by both the user
    and Claude. Always read this before processing a manager message or making
    bulk changes, so you have full context of recent decisions.
    """
    logs = _get(f"/projects/{project_id}/logs")
    if not logs:
        return f"No activity logged yet for project ID={project_id}."

    lines = [f"Project activity log — {len(logs)} entries (newest first):\n"]
    for log in logs:
        author = "Claude" if log["author"] == "claude" else "You"
        ts = log["created_at"][:16].replace("T", " ")
        lines.append(f"[{ts}] {author} (log ID={log['id']}):\n  {log['content']}\n")
    return "\n".join(lines)


@mcp.tool()
def add_project_log(project_id: int, content: str) -> str:
    """
    Add a Claude-authored entry to the project activity log.
    Use this to record: manager messages processed, tasks created/updated in bulk,
    key decisions made, or any context future-Claude should know about.
    Always call this when processing a manager message or making multiple changes.
    """
    _post(f"/projects/{project_id}/logs", {"content": content, "author": "claude"})
    return f"Project log entry added for project ID={project_id}."


if __name__ == "__main__":
    mcp.run()
