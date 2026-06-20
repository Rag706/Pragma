from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api", tags=["task_logs"])


@router.get("/tasks/{task_id}/logs", response_model=list[schemas.TaskLog])
def get_logs(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(models.TaskLog)
        .filter(models.TaskLog.task_id == task_id)
        .order_by(models.TaskLog.created_at.desc())
        .all()
    )


@router.post("/tasks/{task_id}/logs", response_model=schemas.TaskLog, status_code=201)
def create_log(task_id: int, body: schemas.TaskLogCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Log content cannot be empty")
    log = models.TaskLog(task_id=task_id, content=body.content.strip())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/logs/{log_id}", status_code=204)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.TaskLog).filter(models.TaskLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    db.delete(log)
    db.commit()
