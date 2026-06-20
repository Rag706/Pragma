from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import models
import schemas
from database import get_db
from backup import write_backup

router = APIRouter(tags=["tags"])

class SetTagsBody(BaseModel):
    tag_ids: list[int]

@router.get("/api/projects/{project_id}/tags", response_model=list[schemas.TagOut])
def list_tags(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Tag).filter(models.Tag.project_id == project_id).order_by(models.Tag.created_at).all()

@router.post("/api/projects/{project_id}/tags", response_model=schemas.TagOut, status_code=201)
def create_tag(project_id: int, body: schemas.TagCreate, db: Session = Depends(get_db)):
    tag = models.Tag(project_id=project_id, name=body.name, color=body.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@router.put("/api/tags/{tag_id}", response_model=schemas.TagOut)
def update_tag(tag_id: int, body: schemas.TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(tag, k, v)
    db.commit()
    db.refresh(tag)
    return tag

@router.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()

@router.put("/api/tasks/{task_id}/tags")
def set_task_tags(task_id: int, body: SetTagsBody, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.execute(text("DELETE FROM task_tags WHERE task_id = :tid"), {"tid": task_id})
    for tag_id in body.tag_ids:
        db.execute(text("INSERT INTO task_tags (task_id, tag_id) VALUES (:tid, :gid)"), {"tid": task_id, "gid": tag_id})
    db.commit()
    db.refresh(task)
    write_backup(db)
    return {"tag_ids": body.tag_ids}
