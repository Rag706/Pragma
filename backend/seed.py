"""Run once to populate the database with sample data."""
from datetime import date, timedelta
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(models.Project).count() > 0:
    print("Database already seeded. Skipping.")
    db.close()
    exit()

today = date.today()

projects_data = [
    {"name": "Miraven — Game Dev",        "color": "#8B5CF6", "type": "project",  "description": "HxH-inspired mobile game"},
    {"name": "Accenture — Client Work",   "color": "#0EA5E9", "type": "project",  "description": "Client delivery tasks"},
    {"name": "Personal",                  "color": "#10B981", "type": "activity", "description": "Personal goals and errands"},
    {"name": "Admin",                     "color": "#F59E0B", "type": "activity", "description": "Admin and operations"},
]

projects = []
for p in projects_data:
    proj = models.Project(**p)
    db.add(proj)
    db.flush()
    projects.append(proj)

p_game, p_work, p_personal, p_admin = projects

tasks_data = [
    # Miraven
    {"title": "Set up Unity project structure",       "project_id": p_game.id, "priority": "high",   "status": "done",        "due_date": str(today - timedelta(5))},
    {"title": "Design battle system UI mockups",      "project_id": p_game.id, "priority": "high",   "status": "in_progress", "due_date": str(today + timedelta(3))},
    {"title": "Implement character collection screen","project_id": p_game.id, "priority": "medium", "status": "todo",        "due_date": str(today + timedelta(7))},
    {"title": "Write NPC dialogue for Zone 1",        "project_id": p_game.id, "priority": "medium", "status": "todo",        "due_date": str(today + timedelta(10))},
    {"title": "Create card art pipeline",             "project_id": p_game.id, "priority": "low",    "status": "todo",        "due_date": str(today + timedelta(14))},
    {"title": "Set up CI/CD for Unity builds",        "project_id": p_game.id, "priority": "medium", "status": "on_hold",     "due_date": str(today + timedelta(21))},
    # Accenture
    {"title": "Weekly status report",                 "project_id": p_work.id, "priority": "high",   "status": "todo",        "due_date": str(today)},
    {"title": "Client presentation — Q2 review",     "project_id": p_work.id, "priority": "high",   "status": "in_progress", "due_date": str(today + timedelta(2))},
    {"title": "Sprint planning prep",                 "project_id": p_work.id, "priority": "medium", "status": "todo",        "due_date": str(today + timedelta(1))},
    {"title": "Code review — auth module",            "project_id": p_work.id, "priority": "medium", "status": "done",        "due_date": str(today - timedelta(2))},
    {"title": "Update project risk register",        "project_id": p_work.id, "priority": "low",    "status": "todo",        "due_date": str(today + timedelta(5))},
    {"title": "Onboarding new team member",           "project_id": p_work.id, "priority": "high",   "status": "todo",        "due_date": str(today - timedelta(1)), "notes": "Overdue — reschedule"},
    # Personal
    {"title": "Study Japanese — N3 grammar",          "project_id": p_personal.id, "priority": "medium", "status": "in_progress", "due_date": str(today + timedelta(3))},
    {"title": "Plan workout routine",                 "project_id": p_personal.id, "priority": "low",    "status": "todo",        "due_date": str(today + timedelta(6))},
    {"title": "Read 'The Pragmatic Programmer'",      "project_id": p_personal.id, "priority": "low",    "status": "in_progress", "due_date": str(today + timedelta(30))},
    # Admin
    {"title": "Submit expense report",               "project_id": p_admin.id, "priority": "high",   "status": "todo",        "due_date": str(today)},
    {"title": "Schedule annual health checkup",      "project_id": p_admin.id, "priority": "medium", "status": "todo",        "due_date": str(today + timedelta(14))},
    {"title": "Renew software subscriptions",        "project_id": p_admin.id, "priority": "low",    "status": "done",        "due_date": str(today - timedelta(3))},
]

for t in tasks_data:
    task = models.Task(**t)
    db.add(task)

db.commit()
db.close()
print(f"Seeded {len(projects_data)} projects and {len(tasks_data)} tasks.")
