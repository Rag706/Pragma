from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[schemas.Project])
def list_projects(db: Session = Depends(get_db)):
    return (
        db.query(models.Project)
        .filter(models.Project.is_archived == False)
        .order_by(models.Project.created_at)
        .all()
    )


@router.post("", response_model=schemas.Project, status_code=201)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_proj = models.Project(**project.model_dump())
    db.add(db_proj)
    db.commit()
    db.refresh(db_proj)
    return db_proj


@router.put("/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    for k, v in update.model_dump(exclude_unset=True).items():
        setattr(proj, k, v)
    db.commit()
    db.refresh(proj)
    return proj


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    # Tasks have no FK to projects, delete them first; PRAGMA foreign_keys = ON cascades
    # their children (checklist_items, task_links, task_logs, task_tags) automatically
    db.query(models.Task).filter(models.Task.project_id == project_id).delete(synchronize_session=False)
    # tags and project_references cascade via FK ON DELETE CASCADE
    db.delete(proj)
    db.commit()
