from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from backup import write_backup

router = APIRouter(tags=["references"])

@router.get("/api/projects/{project_id}/references", response_model=list[schemas.ReferenceOut])
def list_references(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.ProjectReference).filter(
        models.ProjectReference.project_id == project_id
    ).order_by(models.ProjectReference.created_at).all()

@router.post("/api/projects/{project_id}/references", response_model=schemas.ReferenceOut, status_code=201)
def create_reference(project_id: int, body: schemas.ReferenceCreate, db: Session = Depends(get_db)):
    ref = models.ProjectReference(project_id=project_id, **body.model_dump())
    db.add(ref)
    db.commit()
    db.refresh(ref)
    write_backup(db)
    return ref

@router.put("/api/references/{ref_id}", response_model=schemas.ReferenceOut)
def update_reference(ref_id: int, body: schemas.ReferenceUpdate, db: Session = Depends(get_db)):
    ref = db.query(models.ProjectReference).filter(models.ProjectReference.id == ref_id).first()
    if not ref:
        raise HTTPException(404, "Reference not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ref, k, v)
    db.commit()
    db.refresh(ref)
    write_backup(db)
    return ref

@router.delete("/api/references/{ref_id}", status_code=204)
def delete_reference(ref_id: int, db: Session = Depends(get_db)):
    ref = db.query(models.ProjectReference).filter(models.ProjectReference.id == ref_id).first()
    if not ref:
        raise HTTPException(404, "Reference not found")
    db.delete(ref)
    db.commit()
    write_backup(db)
