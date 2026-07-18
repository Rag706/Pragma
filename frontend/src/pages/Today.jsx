import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, CalendarClock, Bell, CalendarDays, ChevronRight } from 'lucide-react'
import { getTasks, updateTaskStatus } from '../api/tasks'
import { getProjects } from '../api/projects'
import { format, parseISO, isToday, isPast, addDays, startOfWeek, isSameDay, differenceInDays } from 'date-fns'
import { PRIORITY_CONFIG } from '../components/Badge'

// ── Task row ───────────────────────────────────────────────────────
function TaskRow({ task, projectMap, onDone, onClick, dueMeta }) {
  const proj = task.project_id ? projectMap[task.project_id] : null
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium

  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-zinc-800/40 last:border-0 cursor-pointer group hover:bg-zinc-800/40 transition-colors"
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
      {proj && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: proj.color }} title={proj.name} />
      )}
      <span className={`text-[11px] shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
      {dueMeta && <span className={`text-[10px] font-semibold shrink-0 ${dueMeta.cls}`}>{dueMeta.label}</span>}
    </div>
  )
}

// ── Section card ───────────────────────────────────────────────────
function Section({ title, accent, icon, tasks, projectMap, onDone, onOpen, emptyMsg, getDueMeta }) {
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
              <TaskRow
                key={t.id}
                task={t}
                projectMap={projectMap}
                onDone={onDone}
                onClick={() => onOpen(t.id)}
                dueMeta={getDueMeta?.(t)}
              />
            ))
        }
      </div>
    </div>
  )
}

// ── Main Today page ────────────────────────────────────────────────
export default function Today() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const { data: allTasks = [] } = useQuery({ queryKey: ['tasks'],    queryFn: getTasks })
  const { data: projects  = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const doneMutation = useMutation({
    mutationFn: id => updateTaskStatus(id, 'done'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const active = allTasks.filter(t => !['done', 'cancelled'].includes(t.status))

  const overdueTasks  = active.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
  const todayTasks    = active.filter(t => t.due_date && isToday(parseISO(t.due_date)))
  const reminderTasks = active.filter(t =>
    t.remind_at && (isToday(parseISO(t.remind_at)) || isPast(parseISO(t.remind_at)))
  )
  const dueSoonTasks  = active.filter(t => {
    if (!t.due_date) return false
    const d    = parseISO(t.due_date)
    const diff = differenceInDays(d, new Date())
    return diff >= 1 && diff <= 3
  })

  // Project health
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

  // Week calendar: Mon–Sun of current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function overdueLabel(task) {
    const diff = differenceInDays(new Date(), parseISO(task.due_date))
    if (diff === 1) return { label: '昨日', cls: 'text-rose-400' }
    return { label: `${diff}日前`, cls: 'text-rose-400' }
  }

  function soonLabel(task) {
    const diff = differenceInDays(parseISO(task.due_date), new Date())
    if (diff === 1) return { label: '明日', cls: 'text-yellow-400' }
    return { label: `${diff}日後`, cls: 'text-zinc-500' }
  }

  const openTask = id => navigate(`/tasks?open=${id}`)
  const done     = id => doneMutation.mutate(id)

  return (
    <div className="flex-1 overflow-auto p-6">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-100">Today</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d')} — 全プロジェクト横断</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 272px', alignItems: 'start' }}>

        {/* ── Left: task sections ── */}
        <div className="space-y-3">
          <Section
            title="期限切れ"
            accent="#f87171"
            icon={<AlertTriangle size={12} />}
            tasks={overdueTasks}
            projectMap={projectMap}
            onDone={done}
            onOpen={openTask}
            emptyMsg="期限切れのタスクはありません"
            getDueMeta={overdueLabel}
          />
          <Section
            title="本日期限"
            accent="#fbbf24"
            icon={<CalendarClock size={12} />}
            tasks={todayTasks}
            projectMap={projectMap}
            onDone={done}
            onOpen={openTask}
            emptyMsg="本日期限のタスクはありません"
            getDueMeta={() => ({ label: 'Today', cls: 'text-yellow-400' })}
          />
          <Section
            title="今日のリマインダー"
            accent="#fb923c"
            icon={<Bell size={12} />}
            tasks={reminderTasks}
            projectMap={projectMap}
            onDone={done}
            onOpen={openTask}
            emptyMsg="今日のリマインダーはありません"
          />
          <Section
            title="3日以内の期限"
            accent="#71717a"
            icon={<CalendarDays size={12} />}
            tasks={dueSoonTasks}
            projectMap={projectMap}
            onDone={done}
            onOpen={openTask}
            emptyMsg="3日以内の期限はありません"
            getDueMeta={soonLabel}
          />
        </div>

        {/* ── Right: week calendar + project health ── */}
        <div className="space-y-3">

          {/* Week calendar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">今週の期限</h3>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => {
                const dayTasks = active.filter(t =>
                  t.due_date && isSameDay(parseISO(t.due_date), day)
                )
                const isT = isToday(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center px-0.5 py-2 rounded-lg ${isT ? 'bg-indigo-950 ring-1 ring-indigo-800' : ''}`}
                  >
                    <div className="text-[9px] font-bold text-zinc-600 mb-0.5">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-[13px] font-bold ${isT ? 'text-indigo-400' : 'text-zinc-400'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="flex justify-center gap-0.5 mt-1.5 flex-wrap min-h-[6px]">
                      {dayTasks.slice(0, 3).map(t => (
                        <span
                          key={t.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: projectMap[t.project_id]?.color ?? '#52525b' }}
                          title={t.title}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[8px] text-zinc-600 leading-none">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            {projects.length > 0 && (
              <div className="flex gap-3 mt-3 pt-3 border-t border-zinc-800 flex-wrap">
                {projects.map(p => (
                  <span key={p.id} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Project health */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800">
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">プロジェクト状況</h3>
            </div>
            {projectHealth.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/tasks?project=${p.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40 last:border-0 hover:bg-zinc-800/40 transition-colors text-left group"
                style={p.overdueCount > 0 ? { borderLeftColor: '#f87171', borderLeftWidth: 3 } : p.todayCount > 0 ? { borderLeftColor: '#fbbf24', borderLeftWidth: 3 } : {}}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-zinc-300 truncate">{p.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-2 shrink-0">{p.pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                  <div className="flex gap-2 mt-1.5 text-[10px]">
                    {p.overdueCount > 0 && <span className="text-rose-400 font-bold">🔴 {p.overdueCount}</span>}
                    {p.todayCount   > 0 && <span className="text-yellow-400">🟡 {p.todayCount}</span>}
                    {p.overdueCount === 0 && p.todayCount === 0 && <span className="text-zinc-600">{p.done}/{p.total} done</span>}
                  </div>
                </div>
                <ChevronRight size={12} className="text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors" />
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
