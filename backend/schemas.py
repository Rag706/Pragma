from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

STATUS_VALUES = Literal['backlog', 'todo', 'up_next', 'planning', 'in_progress', 'review', 'testing', 'done', 'blocked', 'on_hold', 'waiting', 'cancelled']
PRIORITY_VALUES = Literal['high', 'medium', 'low']
PROJECT_TYPE_VALUES = Literal['project', 'activity']
REF_TYPE_VALUES = Literal['url', 'note', 'doc']


class ProjectBase(BaseModel):
    name: str
    color: str = "#6366F1"
    type: PROJECT_TYPE_VALUES = "project"
    description: str = ""

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    type: Optional[PROJECT_TYPE_VALUES] = None
    description: Optional[str] = None
    is_archived: Optional[bool] = None

class Project(ProjectBase):
    id: int
    is_archived: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Tags ──────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str
    color: str = "#6366F1"

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class TagOut(BaseModel):
    id: int
    project_id: Optional[int]
    name: str
    color: str
    created_at: datetime
    class Config:
        from_attributes = True


# ── Tasks ─────────────────────────────────────────────────────────

class TaskBase(BaseModel):
    title: str
    project_id: Optional[int] = None
    priority: PRIORITY_VALUES = "medium"
    status: STATUS_VALUES = "todo"
    status_note: Optional[str] = ""
    due_date: Optional[str] = None
    remind_at: Optional[str] = None
    start_date: Optional[str] = None
    progress: int = 0
    notes: Optional[str] = ""
    details: Optional[str] = ""
    is_focus: bool = False
    rank: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[int] = None
    priority: Optional[PRIORITY_VALUES] = None
    status: Optional[STATUS_VALUES] = None
    status_note: Optional[str] = None
    due_date: Optional[str] = None
    remind_at: Optional[str] = None
    start_date: Optional[str] = None
    progress: Optional[int] = None
    notes: Optional[str] = None
    details: Optional[str] = None
    is_focus: Optional[bool] = None
    rank: Optional[int] = None

class TaskStatusUpdate(BaseModel):
    status: STATUS_VALUES

class Task(TaskBase):
    id: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    tags: list[TagOut] = []
    links: list['TaskLinkOut'] = []
    checklist_items: list['ChecklistItemOut'] = []
    class Config:
        from_attributes = True




# ── Checklist ─────────────────────────────────────────────────────

class ChecklistItemCreate(BaseModel):
    title: str
    checked: bool = False
    position: int = 0

class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = None
    checked: Optional[bool] = None
    position: Optional[int] = None

class ChecklistItemOut(BaseModel):
    id: int
    task_id: int
    title: str
    checked: bool
    position: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Task logs ─────────────────────────────────────────────────────

class TaskLogCreate(BaseModel):
    content: str

class TaskLog(BaseModel):
    id: int
    task_id: int
    content: str
    created_at: datetime
    class Config:
        from_attributes = True


# ── Task Links ────────────────────────────────────────────────────

class TaskLinkCreate(BaseModel):
    title: str
    url: str

class TaskLinkOut(BaseModel):
    id: int
    task_id: int
    title: str
    url: str
    created_at: datetime
    class Config:
        from_attributes = True


# ── Time entries ──────────────────────────────────────────────────

class TimeEntryBase(BaseModel):
    task_id:      Optional[int] = None
    project_id:   Optional[int] = None
    date:         str
    start_time:   Optional[str] = None
    duration_min: int
    note:         str = ""
    is_break:     bool = False

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryUpdate(BaseModel):
    date:         Optional[str] = None
    start_time:   Optional[str] = None
    duration_min: Optional[int] = None
    note:         Optional[str] = None

class TimeEntry(TimeEntryBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TimeEntryRich(TimeEntry):
    task_title:    Optional[str] = None
    project_name:  Optional[str] = None
    project_color: Optional[str] = None


# ── Project References ────────────────────────────────────────────

# ── Project Notes ─────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str = ""
    body: str = ""
    color: str = "#a1a1aa"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    color: Optional[str] = None
    project_id: Optional[int] = None

class NoteOut(BaseModel):
    id: int
    project_id: int
    title: str
    body: str
    color: str
    position: int
    created_at: datetime
    class Config:
        from_attributes = True

class NoteReorder(BaseModel):
    ids: list[int]


class ReferenceCreate(BaseModel):
    title: str
    url: Optional[str] = ""
    notes: Optional[str] = ""
    ref_type: REF_TYPE_VALUES = "url"

class ReferenceUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    ref_type: Optional[REF_TYPE_VALUES] = None

class ReferenceOut(BaseModel):
    id: int
    project_id: int
    title: str
    url: Optional[str]
    notes: Optional[str]
    ref_type: str
    created_at: datetime
    class Config:
        from_attributes = True


# ── Project Logs ──────────────────────────────────────────────────

class ProjectLogCreate(BaseModel):
    content: str
    author: str = "user"

class ProjectLogOut(BaseModel):
    id: int
    project_id: int
    content: str
    author: str
    created_at: datetime
    class Config:
        from_attributes = True
