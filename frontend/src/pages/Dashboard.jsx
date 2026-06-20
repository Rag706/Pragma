import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, AlertTriangle, Circle, Check, LayoutDashboard, Target, Clock, CalendarClock, CalendarDays, Zap } from 'lucide-react'
import { getStats } from '../api/stats'
import { getTasks, updateTaskStatus } from '../api/tasks'
import { getProjects } from '../api/projects'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { PRIORITY_CONFIG } from '../components/Badge'
import { useSettings } from '../context/SettingsContext'

const DONUT_R    = 50
const DONUT_CIRC = 2 * Math.PI * DONUT_R
const RING_R     = 42
const RING_CIRC  = 2 * Math.PI * RING_R

// ── KPI Card ───────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, warning = false }) {
  const isAlert = warning && value > 0
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1.5 border transition-all"
      style={{
        borderTop:       `3px solid ${accent}`,
        borderColor:     isAlert ? `${accent}55` : '#27272a',
        borderTopColor:  accent,
        backgroundColor: isAlert ? `${accent}0f` : '#18181b',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        {isAlert && <AlertTriangle size={13} style={{ color: accent }} className="opacity-80" />}
      </div>
      <p
        className={`text-[36px] font-extrabold leading-none ${isAlert ? 'animate-pulse' : ''}`}
        style={{ color: accent }}
      >
        {value ?? '—'}
      </p>
      <p className="text-[11px] text-zinc-600">{sub}</p>
    </div>
  )
}

// ── Donut chart ────────────────────────────────────────────────────
function DonutChart({ kpis }) {
  const total = kpis.total || 1
  const allSegments = [
    { key: 'done',        value: kpis.done,        color: '#34d399', label: 'Done'        },
    { key: 'testing',     value: kpis.testing,     color: '#22d3ee', label: 'Testing'     },
    { key: 'review',      value: kpis.review,      color: '#a78bfa', label: 'Review'      },
    { key: 'in_progress', value: kpis.in_progress, color: '#818cf8', label: 'In Progress' },
    { key: 'planning',    value: kpis.planning,    color: '#38bdf8', label: 'Planning'    },
    { key: 'todo',        value: kpis.todo,        color: '#52525b', label: 'To Do'       },
    { key: 'backlog',     value: kpis.backlog,     color: '#3f3f46', label: 'Backlog'     },
    { key: 'blocked',     value: kpis.blocked,     color: '#fb7185', label: 'Blocked'     },
    { key: 'on_hold',     value: kpis.on_hold,     color: '#f59e0b', label: 'On Hold'     },
    { key: 'waiting',     value: kpis.waiting,     color: '#f97316', label: 'Waiting'     },
    { key: 'cancelled',   value: kpis.cancelled,   color: '#27272a', label: 'Cancelled'   },
  ]
  const segments = allSegments.filter(s => (s.value ?? 0) > 0)
  let acc = 0
  const arcs = segments.map(seg => {
    const dash   = (seg.value / total) * DONUT_CIRC
    const offset = -acc
    acc += dash
    return { ...seg, dash, offset }
  })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-zinc-300 mb-4">Task Status</h2>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={DONUT_R} fill="none" stroke="#27272a" strokeWidth="18" />
          {kpis.total > 0 && arcs.map(a => (
            <circle key={a.key} cx="65" cy="65" r={DONUT_R} fill="none"
              stroke={a.color} strokeWidth="18"
              strokeDasharray={`${a.dash} ${DONUT_CIRC}`}
              strokeDashoffset={a.offset}
            />
          ))}
        </svg>
        <div className="w-full space-y-1.5">
          {segments.map(seg => (
            <div key={seg.key} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-zinc-400 flex-1">{seg.label}</span>
              <span className="text-xs font-bold text-zinc-200">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Completion ring ────────────────────────────────────────────────
function CompletionRing({ done, total }) {
  const pct  = total > 0 ? Math.round((done / total) * 100) : 0
  const dash = (pct / 100) * RING_CIRC

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-zinc-300 mb-4">Completion</h2>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="relative flex items-center justify-center">
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="55" cy="55" r={RING_R} fill="none" stroke="#27272a" strokeWidth="10" />
            <circle cx="55" cy="55" r={RING_R} fill="none" stroke="#34d399" strokeWidth="10"
              strokeDasharray={`${dash} ${RING_CIRC}`} strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-2xl font-black text-emerald-400">{pct}%</div>
            <div className="text-[10px] text-zinc-600">{done} of {total}</div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">Tasks completed</p>
      </div>
    </div>
  )
}

// ── Project progress bar ───────────────────────────────────────────
function ProjectBar({ project }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-zinc-300 truncate">{project.name}</span>
          <span className="text-xs text-zinc-500 ml-2 shrink-0">{project.done}/{project.total}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${project.pct}%`, backgroundColor: project.color }}
          />
        </div>
      </div>
      <span className="text-xs text-zinc-600 w-7 text-right">{project.pct}%</span>
    </div>
  )
}

// ── Priority bars ──────────────────────────────────────────────────
function PriorityBars({ kpis }) {
  const total = kpis.total || 1
  const rows = [
    { label: 'High',   value: kpis.high   ?? 0, color: '#f87171' },
    { label: 'Medium', value: kpis.medium  ?? 0, color: '#fbbf24' },
    { label: 'Low',    value: kpis.low    ?? 0, color: '#34d399' },
  ]
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-2.5">
          <span className="text-[11px] text-zinc-600 w-14 shrink-0">{row.label}</span>
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(row.value / total) * 100}%`, backgroundColor: row.color }}
            />
          </div>
          <span className="text-[11px] text-zinc-600 w-4 text-right shrink-0">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Overview: upcoming row ─────────────────────────────────────────
function formatDue(dateStr) {
  if (!dateStr) return ''
  try {
    const d = parseISO(dateStr)
    if (isToday(d))    return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'MMM d')
  } catch { return dateStr }
}

function UpcomingRow({ task, onClick }) {
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b border-zinc-800/60 last:border-0 cursor-pointer hover:bg-zinc-800/40 rounded-lg px-2 -mx-2 transition-colors"
      onClick={onClick}
    >
      {task.is_overdue
        ? <AlertTriangle size={13} className="text-red-400 shrink-0" />
        : <Circle        size={13} className="text-zinc-700 shrink-0" />
      }
      <span className="flex-1 text-sm truncate text-zinc-200">{task.title}</span>
      {task.is_overdue && (
        <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full shrink-0">
          Overdue
        </span>
      )}
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} title={task.project_name} />
      <span className={`text-xs shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
      <span className={`text-xs w-16 text-right shrink-0 ${task.is_overdue ? 'text-red-400 font-medium' : 'text-zinc-500'}`}>
        {formatDue(task.due_date)}
      </span>
    </div>
  )
}

// ── Focus mode: single task row ────────────────────────────────────
function FocusRow({ task, projectMap, onDone, onClick, accent }) {
  const proj = task.project_id ? projectMap[task.project_id] : null
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40 last:border-0 cursor-pointer group transition-colors"
      style={{ '--hover-bg': `${accent}08` }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = `${accent}08`}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
      onClick={onClick}
    >
      <button
        onClick={e => { e.stopPropagation(); onDone(task.id) }}
        title="Mark as done"
        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full border border-zinc-600 hover:border-emerald-400 hover:bg-emerald-400/10 flex items-center justify-center shrink-0 transition-all"
      >
        <Check size={11} className="text-emerald-400" />
      </button>
      <span className="flex-1 text-sm text-zinc-200 truncate">{task.title}</span>
      {proj && (
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
          <span className="text-xs text-zinc-500 truncate max-w-[80px]">{proj.name}</span>
        </span>
      )}
      <span className={`text-xs shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
    </div>
  )
}

// ── Focus mode: section ────────────────────────────────────────────
function FocusSection({ title, accent, icon, tasks, projectMap, onDone, onOpen, emptyMsg }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}` }}
    >
      {/* Section header with tinted background */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ backgroundColor: `${accent}12`, borderBottomColor: `${accent}25` }}
      >
        <span style={{ color: accent }}>{icon}</span>
        <h3 className="text-sm font-bold" style={{ color: accent }}>{title}</h3>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Rows */}
      <div className="bg-zinc-900">
        {tasks.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-5 italic">{emptyMsg}</p>
        ) : (
          tasks.map(t => (
            <FocusRow
              key={t.id}
              task={t}
              accent={accent}
              projectMap={projectMap}
              onDone={onDone}
              onClick={() => onOpen(t.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const { settings } = useSettings()

  const [dashMode, setDashMode] = useState(
    () => settings.default_dashboard_view
  )

  function switchMode(mode) {
    setDashMode(mode)
  }

  // Stats (always loaded — used by both modes)
  const { data, isLoading } = useQuery({ queryKey: ['stats'], queryFn: getStats })

  // Focus mode data
  const { data: overdueTasks   = [] } = useQuery({ queryKey: ['tasks', { due_filter: 'overdue'   }], queryFn: () => getTasks({ due_filter: 'overdue'   }) })
  const { data: todayTasks     = [] } = useQuery({ queryKey: ['tasks', { due_filter: 'today'     }], queryFn: () => getTasks({ due_filter: 'today'     }) })
  const { data: tomorrowTasks  = [] } = useQuery({ queryKey: ['tasks', { due_filter: 'tomorrow'  }], queryFn: () => getTasks({ due_filter: 'tomorrow'  }) })
  const { data: inProgressRaw  = [] } = useQuery({ queryKey: ['tasks', { status: 'in_progress'   }], queryFn: () => getTasks({ status: 'in_progress'   }) })
  const { data: projects       = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  // De-duplicate: in-progress tasks already shown in overdue/today/tomorrow are excluded
  const shownIds = new Set([...overdueTasks, ...todayTasks, ...tomorrowTasks].map(t => t.id))
  const inProgressTasks = inProgressRaw.filter(t => !shownIds.has(t.id))

  const doneMutation = useMutation({
    mutationFn: (id) => updateTaskStatus(id, 'done'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Loading…</div>
  }

  const { kpis, project_stats, upcoming } = data
  const hasOverdue = upcoming.some(t => t.is_overdue)

  return (
    <div className="flex-1 overflow-auto p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d')} — here's your day at a glance.
          </p>
        </div>

        {/* Overview / Focus toggle */}
        <div className="flex bg-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => switchMode('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${dashMode === 'overview' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <LayoutDashboard size={13} /> Overview
          </button>
          <button
            onClick={() => switchMode('focus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${dashMode === 'focus' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Target size={13} /> Focus
          </button>
        </div>
      </div>

      {/* KPI row — shown in both modes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Overdue"      value={kpis.overdue}      sub="past their deadline"  accent="#f87171" warning />
        <KPICard label="Due Today"    value={kpis.due_today}    sub="need attention today" accent="#fbbf24" warning />
        <KPICard label="Due Tomorrow" value={kpis.due_tomorrow} sub="coming up next"        accent="#a78bfa" />
        <KPICard label="In Progress"  value={kpis.in_progress}  sub="currently working on" accent="#818cf8" />
      </div>

      {/* ── OVERVIEW MODE ───────────────────────────────────────── */}
      {dashMode === 'overview' && (
        <>
          {/* Analytics row */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_200px] gap-3">
            <DonutChart kpis={kpis} />

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-400" /> Project Progress
                </h2>
                <button onClick={() => navigate('/projects')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  View all →
                </button>
              </div>
              {project_stats.length === 0
                ? <p className="text-xs text-zinc-600 text-center py-4">No projects yet.</p>
                : <div className="space-y-4">{project_stats.map(p => <ProjectBar key={p.id} project={p} />)}</div>
              }
              <div className="mt-5 pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-400 mb-3">Priority Mix</h3>
                <PriorityBars kpis={kpis} />
              </div>
            </div>

            <CompletionRing done={kpis.done} total={kpis.total} />
          </div>

          {/* Upcoming & Overdue */}
          <div className={`bg-zinc-900 rounded-xl p-5 border ${hasOverdue ? 'border-red-500/20' : 'border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                {hasOverdue && <AlertTriangle size={13} className="text-red-400" />}
                Upcoming & Overdue
              </h2>
              <button onClick={() => navigate('/tasks')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                View all →
              </button>
            </div>
            {upcoming.length === 0
              ? <p className="text-xs text-zinc-600 text-center py-4">Nothing due this week. 🎉</p>
              : upcoming.map(t => <UpcomingRow key={t.id} task={t} onClick={() => navigate(`/tasks?open=${t.id}`)} />)
            }
          </div>
        </>
      )}

      {/* ── FOCUS MODE ──────────────────────────────────────────── */}
      {dashMode === 'focus' && (
        <div className="space-y-3">
          {settings.focus_show_overdue && (
            <FocusSection
              title="Overdue"
              accent="#f87171"
              icon={<AlertTriangle size={14} />}
              tasks={overdueTasks}
              projectMap={projectMap}
              onDone={id => doneMutation.mutate(id)}
              onOpen={id => navigate(`/tasks?open=${id}`)}
              emptyMsg="No overdue tasks."
            />
          )}
          {settings.focus_show_today && (
            <FocusSection
              title="Due Today"
              accent="#fbbf24"
              icon={<CalendarClock size={14} />}
              tasks={todayTasks}
              projectMap={projectMap}
              onDone={id => doneMutation.mutate(id)}
              onOpen={id => navigate(`/tasks?open=${id}`)}
              emptyMsg="Nothing due today."
            />
          )}
          {settings.focus_show_tomorrow && (
            <FocusSection
              title="Due Tomorrow"
              accent="#a78bfa"
              icon={<CalendarDays size={14} />}
              tasks={tomorrowTasks}
              projectMap={projectMap}
              onDone={id => doneMutation.mutate(id)}
              onOpen={id => navigate(`/tasks?open=${id}`)}
              emptyMsg="Nothing due tomorrow."
            />
          )}
          {settings.focus_show_in_progress && (
            <FocusSection
              title="In Progress"
              accent="#818cf8"
              icon={<Zap size={14} />}
              tasks={inProgressTasks}
              projectMap={projectMap}
              onDone={id => doneMutation.mutate(id)}
              onOpen={id => navigate(`/tasks?open=${id}`)}
              emptyMsg="No tasks currently in progress."
            />
          )}
        </div>
      )}

    </div>
  )
}
