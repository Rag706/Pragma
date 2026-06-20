from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime, timedelta, timezone
from pydantic import BaseModel
import models
import schemas
from database import get_db
from backup import write_backup

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.post("/bulk-delete", status_code=204)
def bulk_delete_tasks(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    db.query(models.Task).filter(models.Task.id.in_(body.ids)).delete(synchronize_session=False)
    db.commit()
    write_backup(db)


@router.delete("/all", status_code=204)
def delete_all_tasks(
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Bulk delete — optionally scoped to a project."""
    q = db.query(models.Task)
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    q.delete(synchronize_session=False)
    db.commit()
    write_backup(db)


@router.get("", response_model=list[schemas.Task])
def list_tasks(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    due_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Task)
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if status:
        q = q.filter(models.Task.status == status)
    if priority:
        q = q.filter(models.Task.priority == priority)
    if search:
        q = q.filter(models.Task.title.ilike(f"%{search}%"))
    if due_filter == "today":
        today_str = date.today().isoformat()
        q = q.filter(models.Task.due_date == today_str, models.Task.status != "done")
    elif due_filter == "tomorrow":
        tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
        q = q.filter(models.Task.due_date == tomorrow_str, models.Task.status != "done")
    elif due_filter == "week":
        today_str = date.today().isoformat()
        week_str = (date.today() + timedelta(days=7)).isoformat()
        q = q.filter(models.Task.due_date >= today_str, models.Task.due_date <= week_str, models.Task.status != "done")
    elif due_filter == "overdue":
        today_str = date.today().isoformat()
        q = q.filter(models.Task.due_date < today_str, models.Task.status != "done", models.Task.due_date.isnot(None))
    return q.order_by(models.Task.created_at.desc()).all()


@router.post("", response_model=schemas.Task, status_code=201)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    write_backup(db)
    return db_task


@router.get("/{task_id}", response_model=schemas.Task)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.put("/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    data = update.model_dump(exclude_unset=True)
    if "status" in data:
        if data["status"] == "done" and task.status != "done":
            data["completed_at"] = datetime.now(timezone.utc)
        elif data["status"] != "done":
            data["completed_at"] = None
    for k, v in data.items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    write_backup(db)
    return task


@router.patch("/{task_id}/status", response_model=schemas.Task)
def update_status(task_id: int, update: schemas.TaskStatusUpdate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if update.status == "done" and task.status != "done":
        task.completed_at = datetime.now(timezone.utc)
    elif update.status != "done":
        task.completed_at = None
    task.status = update.status
    db.commit()
    db.refresh(task)
    write_backup(db)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
    write_backup(db)
