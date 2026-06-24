from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from datetime import date, timedelta
import models
from database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    today      = date.today().isoformat()
    tomorrow   = (date.today() + timedelta(days=1)).isoformat()
    week_later = (date.today() + timedelta(days=7)).isoformat()
    week_ago   = (date.today() - timedelta(days=7)).isoformat()

    # ── Query 1: all KPI counts in one pass ──────────────────────────
    active = models.Task.status.notin_(["done", "cancelled"])

    kpi = db.query(
        func.count(models.Task.id).label("total"),
        func.sum(case((models.Task.status == "backlog",     1), else_=0)).label("backlog"),
        func.sum(case((models.Task.status == "todo",        1), else_=0)).label("todo"),
        func.sum(case((models.Task.status == "planning",    1), else_=0)).label("planning"),
        func.sum(case((models.Task.status == "in_progress", 1), else_=0)).label("in_progress"),
        func.sum(case((models.Task.status == "review",      1), else_=0)).label("review"),
        func.sum(case((models.Task.status == "testing",     1), else_=0)).label("testing"),
        func.sum(case((models.Task.status == "done",        1), else_=0)).label("done"),
        func.sum(case((models.Task.status == "blocked",     1), else_=0)).label("blocked"),
        func.sum(case((models.Task.status == "on_hold",     1), else_=0)).label("on_hold"),
        func.sum(case((models.Task.status == "waiting",     1), else_=0)).label("waiting"),
        func.sum(case((models.Task.status == "cancelled",   1), else_=0)).label("cancelled"),
        func.sum(case(
            (and_(models.Task.due_date == today, active), 1), else_=0
        )).label("due_today"),
        func.sum(case(
            (and_(models.Task.due_date == tomorrow, active), 1), else_=0
        )).label("due_tomorrow"),
        func.sum(case(
            (and_(
                models.Task.due_date < today,
                active,
                models.Task.due_date.isnot(None),
            ), 1), else_=0
        )).label("overdue"),
        func.sum(case((models.Task.priority == "high",   1), else_=0)).label("high"),
        func.sum(case((models.Task.priority == "medium", 1), else_=0)).label("medium"),
        func.sum(case((models.Task.priority == "low",    1), else_=0)).label("low"),
        func.sum(case((models.Task.rank.isnot(None),     1), else_=0)).label("rank_count"),
    ).first()

    # ── Query 2: done-this-week (needs date() on completed_at) ───────
    done_this_week = (
        db.query(func.count(models.Task.id))
        .filter(models.Task.status == "done", func.date(models.Task.completed_at) >= week_ago)
        .scalar()
    ) or 0

    # ── Query 3: per-project aggregates (one GROUP BY, not 3N calls) ─
    projects = db.query(models.Project).filter(models.Project.is_archived == False).all()

    proj_rows = db.query(
        models.Task.project_id,
        func.count(models.Task.id).label("total"),
        func.sum(case((models.Task.status == "done", 1), else_=0)).label("done"),
        func.sum(case(
            (and_(
                models.Task.due_date < today,
                models.Task.status != "done",
                models.Task.due_date.isnot(None),
            ), 1), else_=0
        )).label("overdue"),
        func.min(models.Task.rank).label("top_rank"),
    ).group_by(models.Task.project_id).all()

    stats_map = {r.project_id: r for r in proj_rows}

    project_stats = []
    for p in projects:
        r = stats_map.get(p.id)
        p_total    = r.total    if r else 0
        p_done     = r.done     if r else 0
        p_overdue  = r.overdue  if r else 0
        p_top_rank = r.top_rank if r else None
        project_stats.append({
            "id":       p.id,
            "name":     p.name,
            "color":    p.color,
            "type":     p.type,
            "total":    p_total,
            "done":     p_done,
            "overdue":  p_overdue,
            "top_rank": p_top_rank,
            "pct":      round((p_done / p_total * 100) if p_total > 0 else 0),
        })

    # ── Query 4: upcoming tasks with JOIN (not N project lookups) ────
    # Include overdue tasks (due_date < today) as well as upcoming (up to 7 days ahead)
    upcoming_rows = (
        db.query(models.Task, models.Project)
        .outerjoin(models.Project, models.Task.project_id == models.Project.id)
        .filter(
            models.Task.due_date <= week_later,
            models.Task.due_date.isnot(None),
            models.Task.status.notin_(["done", "cancelled"]),
        )
        .order_by(models.Task.due_date)
        .limit(10)
        .all()
    )

    upcoming = [
        {
            "id":            t.id,
            "title":         t.title,
            "due_date":      t.due_date,
            "priority":      t.priority,
            "status":        t.status,
            "is_overdue":    t.due_date < today,
            "project_name":  proj.name  if proj else "No Project",
            "project_color": proj.color if proj else "#71717A",
        }
        for t, proj in upcoming_rows
    ]

    return {
        "kpis": {
            "total":          kpi.total          or 0,
            "backlog":        kpi.backlog        or 0,
            "todo":           kpi.todo           or 0,
            "planning":       kpi.planning       or 0,
            "in_progress":    kpi.in_progress    or 0,
            "review":         kpi.review         or 0,
            "testing":        kpi.testing        or 0,
            "done":           kpi.done           or 0,
            "blocked":        kpi.blocked        or 0,
            "on_hold":        kpi.on_hold        or 0,
            "waiting":        kpi.waiting        or 0,
            "cancelled":      kpi.cancelled      or 0,
            "due_today":      kpi.due_today      or 0,
            "due_tomorrow":   kpi.due_tomorrow   or 0,
            "overdue":        kpi.overdue        or 0,
            "done_this_week": done_this_week,
            "high":           kpi.high           or 0,
            "medium":         kpi.medium         or 0,
            "low":            kpi.low            or 0,
            "rank_count":     kpi.rank_count     or 0,
        },
        "project_stats": project_stats,
        "upcoming":       upcoming,
    }
