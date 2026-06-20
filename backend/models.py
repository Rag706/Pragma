from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from database import Base

# Task ↔ Tag many-to-many association table
task_tags_table = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id",  Integer, ForeignKey("tags.id",  ondelete="CASCADE"), primary_key=True),
)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#6366F1")
    type = Column(String(20), default="project")
    description = Column(Text, default="")
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#6366F1")
    created_at = Column(DateTime, server_default=func.now())

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    project_id = Column(Integer, nullable=True)
    priority = Column(String(10), default="medium")
    status = Column(String(20), default="todo")
    status_note = Column(String(200), nullable=True, default="")
    due_date = Column(String(10), nullable=True)
    start_date = Column(String(10), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    progress = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    tags = relationship("Tag", secondary=task_tags_table, lazy="selectin")
    links = relationship("TaskLink", lazy="selectin", cascade="all, delete-orphan")
    checklist_items = relationship("ChecklistItem", lazy="selectin", cascade="all, delete-orphan", order_by="ChecklistItem.position")

class TaskLog(Base):
    __tablename__ = "task_logs"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TaskLink(Base):
    __tablename__ = "task_links"
    id         = Column(Integer, primary_key=True, index=True)
    task_id    = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title      = Column(String(200), nullable=False)
    url        = Column(String(500), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    id         = Column(Integer, primary_key=True, index=True)
    task_id    = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title      = Column(String(500), nullable=False)
    checked    = Column(Boolean, default=False, nullable=False)
    position   = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class TimeEntry(Base):
    __tablename__ = "time_entries"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=True)
    project_id = Column(Integer, nullable=True)
    date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=True)
    duration_min = Column(Integer, nullable=False)
    note = Column(Text, default="")
    is_break = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class ProjectReference(Base):
    __tablename__ = "project_references"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    url = Column(String(500), nullable=True, default="")
    notes = Column(Text, default="")
    ref_type = Column(String(10), default="url")  # url | note | doc
    created_at = Column(DateTime, server_default=func.now())
