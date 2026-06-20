from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db

router = APIRouter(prefix="/api", tags=["checklist"])


def _sync_progress(task_id: int, db: Session):
    items = db.query(models.ChecklistItem).filter(models.ChecklistItem.task_id == task_id).all()
    if not items:
        return
    pct = round(sum(1 for i in items if i.checked) / len(items) * 100)
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task:
        task.progress = pct
        db.commit()


@router.get("/tasks/{task_id}/checklist", response_model=list[schemas.ChecklistItemOut])
def list_items(task_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.ChecklistItem)
        .filter(models.ChecklistItem.task_id == task_id)
        .order_by(models.ChecklistItem.position)
        .all()
    )


@router.post("/tasks/{task_id}/checklist", response_model=schemas.ChecklistItemOut, status_code=201)
def create_item(task_id: int, data: schemas.ChecklistItemCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    count = db.query(models.ChecklistItem).filter(models.ChecklistItem.task_id == task_id).count()
    item = models.ChecklistItem(task_id=task_id, position=count, **data.model_dump(exclude={"position"}))
    db.add(item)
    db.commit()
    db.refresh(item)
    _sync_progress(task_id, db)
    db.refresh(item)
    return item


@router.patch("/checklist/{item_id}", response_model=schemas.ChecklistItemOut)
def update_item(item_id: int, data: schemas.ChecklistItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    _sync_progress(item.task_id, db)
    db.refresh(item)
    return item


@router.delete("/checklist/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    task_id = item.task_id
    db.delete(item)
    db.commit()
    _sync_progress(task_id, db)
