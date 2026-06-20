from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/time-entries", tags=["time-entries"])


@router.get("", response_model=list[schemas.TimeEntryRich])
def list_entries(
    task_id:    Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    date_from:  Optional[str] = Query(None),
    date_to:    Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.TimeEntry.id,
            models.TimeEntry.task_id,
            models.TimeEntry.project_id,
            models.TimeEntry.date,
            models.TimeEntry.start_time,
            models.TimeEntry.duration_min,
            models.TimeEntry.note,
            models.TimeEntry.is_break,
            models.TimeEntry.created_at,
            models.Task.title.label("task_title"),
            models.Project.name.label("project_name"),
            models.Project.color.label("project_color"),
        )
        .outerjoin(models.Task,    models.TimeEntry.task_id    == models.Task.id)
        .outerjoin(models.Project, models.TimeEntry.project_id == models.Project.id)
        .filter(
            *([models.TimeEntry.task_id    == task_id]    if task_id    is not None else []),
            *([models.TimeEntry.project_id == project_id] if project_id is not None else []),
            *([models.TimeEntry.date >= date_from]         if date_from              else []),
            *([models.TimeEntry.date <= date_to]           if date_to                else []),
        )
        .order_by(models.TimeEntry.date.desc(), models.TimeEntry.created_at.desc())
        .all()
    )

    return [
        {
            "id":            r.id,
            "task_id":       r.task_id,
            "project_id":    r.project_id,
            "date":          r.date,
            "start_time":    r.start_time,
            "duration_min":  r.duration_min,
            "note":          r.note or "",
            "is_break":      bool(r.is_break),
            "created_at":    r.created_at,
            "task_title":    r.task_title,
            "project_name":  r.project_name,
            "project_color": r.project_color or "#71717A",
        }
        for r in rows
    ]


@router.post("", response_model=schemas.TimeEntry, status_code=201)
def create_entry(entry: schemas.TimeEntryCreate, db: Session = Depends(get_db)):
    if entry.duration_min <= 0:
        raise HTTPException(422, "duration_min must be greater than 0")
    db_entry = models.TimeEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put("/{entry_id}", response_model=schemas.TimeEntry)
def update_entry(entry_id: int, update: schemas.TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.TimeEntry).filter(models.TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Time entry not found")
    data = update.model_dump(exclude_unset=True)
    if "duration_min" in data and data["duration_min"] <= 0:
        raise HTTPException(422, "duration_min must be greater than 0")
    for k, v in data.items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.TimeEntry).filter(models.TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Time entry not found")
    db.delete(entry)
    db.commit()
