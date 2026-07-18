import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, CalendarClock, Zap, ChevronRight } from 'lucide-react'
import { getTasks, updateTaskStatus } from '../api/tasks'
import { getProjects } from '../api/projects'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { PRIORITY_CONFIG } from '../components/Badge'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── Task row inside a section ───────────────────────────────────────
function FocusRow({ task, projectMap, onDone, onClick, accent }) {
  const proj = task.project_id ? projectMap[task.project_id] : null
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 border-b border-zinc-800/40 last:border-0 cursor-pointer group transition-colors"
      onMouseEnter={e => e.currentTarget.style.backgroundColor = `${accent}08`}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
      onClick={onClick}
    >
      <button
        onClick={e => { e.stopPropagation(); onDone(task.id) }}
        className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full border border-zinc-600 hover:border-emerald-400 hover:bg-emerald-400/10 flex items-center justify-center shrink-0 transition-all"
      >
        <Check size={9} className="text-emerald-400" />
      </button>
      <span className="text-[10px] font-mono text-zinc-600 shrink-0">#{task.id}</span>
      <span className="flex-1 text-[12.5px] text-zinc-200 truncate">{task.title}</span>
      {proj && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: proj.color }} title={proj.name} />}
      <span className={`text-[11px] shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
    </div>
  )
}

// ── Section card ────────────────────────────────────────────────────
function FocusSection({ title, accent, icon, tasks, projectMap, onDone, onOpen, emptyMsg }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${accent}28`, borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b" style={{ background: `${accent}10`, borderColor: `${accent}22` }}>
        <span style={{ color: accent }}>{icon}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-wider flex-1" style={{ color: accent }}>{title}</h3>
        <span className="text-[10px] font-bold px-1.5 py-px rounded-full" style={{ background: `${accent}20`, color: accent }}>
          {tasks.length}
        </span>
      </div>
      <div className="bg-zinc-900">
        {tasks.length === 0
          ? <p className="text-xs text-zinc-600 text-center py-4 italic">{emptyMsg}</p>
          : tasks.map(t => (
              <FocusRow
                key={t.id}
                task={t}
                accent={accent}
                projectMap={projectMap}
                onDone={onDone}
                onClick={() => onOpen(t.id)}
              />
            ))
        }
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedProject, setSelectedProject] = useState(null)

  const { data: allTasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  const { data: projects  = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const doneMutation = useMutation({
    mutationFn: id => updateTaskStatus(id, 'done'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // Derive sections from allTasks (filtered by selected project)
  const baseTasks = selectedProject ? allTasks.filter(t => t.project_id === selectedProject) : allTasks
  const active    = baseTasks.filter(t => !['done', 'cancelled'].includes(t.status))

  const overdueTasks    = active.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
  const todayTasks      = active.filter(t => t.due_date && isToday(parseISO(t.due_date)))
  const urgentIds       = new Set([...overdueTasks, ...todayTasks].map(t => t.id))
  const inProgressTasks = active.filter(t => t.status === 'in_progress' && !urgentIds.has(t.id))
  const upNextTasks     = active.filter(t => t.status === 'up_next')

  // Global alert counts (always all projects, for the summary pill)
  const allActive      = allTasks.filter(t => !['done', 'cancelled'].includes(t.status))
  const globalOverdue  = allActive.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length
  const globalToday    = allActive.filter(t => t.due_date && isToday(parseISO(t.due_date))).length
  const globalProgress = allActive.filter(t => t.status === 'in_progress').length

  // Project health (for chips + bottom cards)
  const projectHealth = projects.map(p => {
    const pAll    = allTasks.filter(t => t.project_id === p.id)
    const pActive = pAll.filter(t => !['done', 'cancelled'].includes(t.status))
    const done    = pAll.filter(t => t.status === 'done').length
    const total   = pAll.length
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0
    const overdue = pActive.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length
    const today   = pActive.filter(t => t.due_date && isToday(parseISO(t.due_date))).length
    return { ...p, done, total, pct, overdueCount: overdue, todayCount: today }
  })

  return (
    <div className="flex-1 overflow-auto p-6 space-y-4">

      {/* ── Greeting header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{getGreeting()}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>

        {/* Alert summary pill */}
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[12.5px] flex-wrap">
          {globalOverdue > 0 && (
            <>
              <span className="flex items-center gap-1.5 font-semibold text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                {globalOverdue}件 期限切れ
              </span>
              <span className="w-px h-3 bg-zinc-700" />
            </>
          )}
          {globalToday > 0 && (
            <>
              <span className="flex items-center gap-1.5 font-semibold text-yellow-400">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                {globalToday}件 本日期限
              </span>
              <span className="w-px h-3 bg-zinc-700" />
            </>
          )}
          <span className="flex items-center gap-1.5 font-semibold text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            {globalProgress}件 作業中
          </span>
          {globalOverdue === 0 && globalToday === 0 && (
            <>
              <span className="w-px h-3 bg-zinc-700" />
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                期限切れなし
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Project filter chips ── */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedProject(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selectedProject === null
              ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
          }`}
        >
          All Projects
        </button>
        {projectHealth.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedProject === p.id
                ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
            {p.overdueCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-rose-950 text-rose-400 border border-rose-900">
                🔴 {p.overdueCount}
              </span>
            )}
            {p.overdueCount === 0 && p.todayCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-amber-950/60 text-amber-400 border border-amber-900/60">
                🟡 {p.todayCount}
              </span>
            )}
            {p.overdueCount === 0 && p.todayCount === 0 && (
              <span className="text-emerald-600 text-[10px] font-bold">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* ── 2-column section grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: urgent */}
        <div className="flex flex-col gap-3">
          <FocusSection
            title="Overdue"
            accent="#f87171"
            icon={<AlertTriangle size={12} />}
            tasks={overdueTasks}
            projectMap={projectMap}
            onDone={id => doneMutation.mutate(id)}
            onOpen={id => navigate(`/tasks?open=${id}`)}
            emptyMsg="No overdue tasks."
          />
          <FocusSection
            title="Due Today"
            accent="#fbbf24"
            icon={<CalendarClock size={12} />}
            tasks={todayTasks}
            projectMap={projectMap}
            onDone={id => doneMutation.mutate(id)}
            onOpen={id => navigate(`/tasks?open=${id}`)}
            emptyMsg="Nothing due today."
          />
        </div>

        {/* Right: active work */}
        <div className="flex flex-col gap-3">
          <FocusSection
            title="In Progress"
            accent="#818cf8"
            icon={<Zap size={12} />}
            tasks={inProgressTasks}
            projectMap={projectMap}
            onDone={id => doneMutation.mutate(id)}
            onOpen={id => navigate(`/tasks?open=${id}`)}
            emptyMsg="No tasks in progress."
          />
          <FocusSection
            title="Up Next"
            accent="#a78bfa"
            icon={<ChevronRight size={12} />}
            tasks={upNextTasks}
            projectMap={projectMap}
            onDone={id => doneMutation.mutate(id)}
            onOpen={id => navigate(`/tasks?open=${id}`)}
            emptyMsg="No upcoming tasks queued."
          />
        </div>
      </div>

      {/* ── Project health row ── */}
      {projectHealth.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-700 mb-2.5">Project Health</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(projectHealth.length, 4)}, 1fr)` }}>
            {projectHealth.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/tasks?project=${p.id}`)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-left hover:border-zinc-700 transition-colors group"
                style={
                  p.overdueCount > 0 ? { borderLeftColor: '#f87171', borderLeftWidth: 3 } :
                  p.todayCount   > 0 ? { borderLeftColor: '#fbbf24', borderLeftWidth: 3 } : {}
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="text-[12px] font-bold text-zinc-300 truncate flex-1">{p.name}</span>
                  <ChevronRight size={12} className="text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors" />
                </div>
                <div className="flex gap-2 mb-2.5 text-[11px] flex-wrap">
                  {p.overdueCount > 0 && <span className="text-rose-400 font-bold">🔴 {p.overdueCount} overdue</span>}
                  {p.todayCount   > 0 && <span className="text-yellow-400">🟡 {p.todayCount} today</span>}
                  {p.overdueCount === 0 && p.todayCount === 0 && (
                    <span className="text-emerald-600 font-bold">✓ All clear</span>
                  )}
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-zinc-600">
                  <span>{p.done}/{p.total} done</span>
                  <span>{p.pct}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
