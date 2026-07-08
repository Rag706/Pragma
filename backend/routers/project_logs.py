from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api", tags=["project_logs"])


@router.get("/projects/{project_id}/logs", response_model=list[schemas.ProjectLogOut])
def get_project_logs(project_id: int, limit: int = 100, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return (
        db.query(models.ProjectLog)
        .filter(models.ProjectLog.project_id == project_id)
        .order_by(models.ProjectLog.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/projects/{project_id}/logs", response_model=schemas.ProjectLogOut, status_code=201)
def create_project_log(project_id: int, body: schemas.ProjectLogCreate, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Log content cannot be empty")
    if body.author not in ("user", "claude"):
        raise HTTPException(status_code=422, detail="author must be 'user' or 'claude'")
    log = models.ProjectLog(project_id=project_id, content=body.content.strip(), author=body.author)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/project_logs/{log_id}", status_code=204)
def delete_project_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.ProjectLog).filter(models.ProjectLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    db.delete(log)
    db.commit()
