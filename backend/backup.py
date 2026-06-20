"""
Auto-backup: writes tasks_backup.json after every task write operation.
The file lives next to the database (backend/tasks_backup.json).
If anything goes wrong, the error is logged but never propagates to the caller.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import models

BACKUP_PATH = Path(__file__).parent / "tasks_backup.json"


def write_backup(db: Session) -> None:
    try:
        tasks = db.query(models.Task).order_by(models.Task.id).all()
        projects = {
            p.id: {"name": p.name, "color": p.color}
            for p in db.query(models.Project)
            .filter(models.Project.is_archived == False)
            .all()
        }

        task_list = []
        for t in tasks:
            proj = projects.get(t.project_id) if t.project_id else None
            task_list.append({
                "id":           t.id,
                "title":        t.title,
                "status":       t.status,
                "priority":     t.priority,
                "project_id":   t.project_id,
                "project_name": proj["name"] if proj else None,
                "due_date":     t.due_date,
                "start_date":   t.start_date,
                "notes":        t.notes or "",
                "created_at":   t.created_at.isoformat() if t.created_at else None,
            })

        payload = {
            "exported_at":  datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "total_tasks":  len(task_list),
            "tasks":        task_list,
        }

        BACKUP_PATH.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as exc:
        print(f"[backup] Warning — could not write backup: {exc}")
