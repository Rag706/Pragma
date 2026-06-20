from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db

router = APIRouter(prefix="/api", tags=["task_links"])

@router.get("/tasks/{task_id}/links", response_model=list[schemas.TaskLinkOut])
def list_links(task_id: int, db: Session = Depends(get_db)):
    return db.query(models.TaskLink).filter(models.TaskLink.task_id == task_id).order_by(models.TaskLink.created_at).all()

@router.post("/tasks/{task_id}/links", response_model=schemas.TaskLinkOut, status_code=201)
def create_link(task_id: int, data: schemas.TaskLinkCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    link = models.TaskLink(task_id=task_id, **data.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

@router.put("/links/{link_id}", response_model=schemas.TaskLinkOut)
def update_link(link_id: int, data: schemas.TaskLinkCreate, db: Session = Depends(get_db)):
    link = db.query(models.TaskLink).filter(models.TaskLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    for k, v in data.model_dump().items():
        setattr(link, k, v)
    db.commit()
    db.refresh(link)
    return link

@router.delete("/links/{link_id}", status_code=204)
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(models.TaskLink).filter(models.TaskLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
