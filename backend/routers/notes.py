from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from backup import write_backup

router = APIRouter(tags=["notes"])

@router.get("/api/projects/{project_id}/notes", response_model=list[schemas.NoteOut])
def list_notes(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.ProjectNote).filter(
        models.ProjectNote.project_id == project_id
    ).order_by(models.ProjectNote.position, models.ProjectNote.created_at).all()

@router.post("/api/projects/{project_id}/notes", response_model=schemas.NoteOut, status_code=201)
def create_note(project_id: int, body: schemas.NoteCreate, db: Session = Depends(get_db)):
    max_pos = db.query(models.ProjectNote).filter(
        models.ProjectNote.project_id == project_id
    ).count()
    note = models.ProjectNote(project_id=project_id, position=max_pos, **body.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    write_backup(db)
    return note

@router.put("/api/projects/{project_id}/notes/reorder", status_code=204)
def reorder_notes(project_id: int, body: schemas.NoteReorder, db: Session = Depends(get_db)):
    for pos, note_id in enumerate(body.ids):
        db.query(models.ProjectNote).filter(
            models.ProjectNote.id == note_id,
            models.ProjectNote.project_id == project_id
        ).update({"position": pos})
    db.commit()
    write_backup(db)

@router.put("/api/notes/{note_id}", response_model=schemas.NoteOut)
def update_note(note_id: int, body: schemas.NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(models.ProjectNote).filter(models.ProjectNote.id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(note, k, v)
    db.commit()
    db.refresh(note)
    write_backup(db)
    return note

@router.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(models.ProjectNote).filter(models.ProjectNote.id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()
    write_backup(db)
