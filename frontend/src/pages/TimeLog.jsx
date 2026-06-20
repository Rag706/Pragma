import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, X, Hourglass, ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react'
import { getTimeEntries, createTimeEntry, deleteTimeEntry } from '../api/timeEntries'
import { getProjects } from '../api/projects'
import { getTasks } from '../api/tasks'
import { parseDurationToMinutes, formatMinutes, localDateISO, todayISO, weekStartISO, monthStartISO } from '../utils/time'
import { format, parseISO } from 'date-fns'
import Modal from '../components/Modal'

// ── Calendar constants ─────────────────────────────────────────────
const SLOT_H    = 40           // px per 30-min slot
const HOUR_H    = SLOT_H * 2   // 80px per hour
const CAL_START = 9            // grid starts at 9 AM
const CAL_END   = 22           // grid ends at 10 PM (exclusive)
const NUM_HOURS = CAL_END - CAL_START   // 13 hours visible
const GRID_H    = NUM_HOURS * HOUR_H    // 1040px total height

// ── Generic helpers ────────────────────────────────────────────────
function sumMinutes(entries) {
  return entries.reduce((s, e) => s + e.duration_min, 0)
}

function groupByDate(entries) {
  return entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
}

// ── Time / layout helpers ──────────────────────────────────────────
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTop(totalMin) {
  return ((totalMin - CAL_START * 60) / 30) * SLOT_H
}

function hourLabel(h) {
  const period = h < 12 ? 'AM' : 'PM'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh} ${period}`
}

// 15-min time options from 06:00 to 22:00
const TIME_OPTS = (() => {
  const opts = []
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const period = h < 12 ? 'AM' : 'PM'
      const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
      opts.push({ value: `${hh}:${mm}`, label: `${dh}:${mm} ${period}` })
    }
  }
  return opts
})()

function nearestTime() {
  const now = new Date()
  let h = now.getHours()
  let m = Math.ceil(now.getMinutes() / 15) * 15
  if (m === 60) { h += 1; m = 0 }
  if (h < 9) return '09:00'
  if (h > 22 || (h === 22 && m > 0)) return '09:00'
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Greedy column-assignment for overlapping entries.
// totalCols is per-entry: only counts columns within its actual overlap cluster.
function layoutDay(entries) {
  if (!entries.length) return []
  const sorted = [...entries].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const colEnds = []
  const laid = sorted.map(e => {
    const s   = timeToMin(e.start_time)
    const end = s + e.duration_min
    let col = colEnds.findIndex(ce => s >= ce)
    if (col === -1) { col = colEnds.length; colEnds.push(end) }
    else colEnds[col] = end
    return { ...e, col, _s: s, _end: end }
  })
  // For each entry, totalCols = max col of all entries it overlaps with + 1
  return laid.map(e => {
    const totalCols = Math.max(...laid
      .filter(o => o._s < e._end && o._end > e._s)
      .map(o => o.col)
    ) + 1
    return { ...e, totalCols }
  })
}

function getWeekDays(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return localDateISO(d)
  })
}

function shiftWeek(mondayStr, delta) {
  const d = new Date(mondayStr + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return localDateISO(d)
}

// ── Log Time form ──────────────────────────────────────────────────
function LogTimeForm({ projects, tasks, onSubmit, onCancel, loading }) {
  const [projectId, setProjectId] = useState('')
  const [taskId,    setTaskId]    = useState('')
  const [date,      setDate]      = useState(todayISO())
  const [startTime, setStartTime] = useState(nearestTime())
  const [duration,  setDuration]  = useState('')
  const [note,      setNote]      = useState('')

  const fieldCls =
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 ' +
    'placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors'

  function handleProjectChange(val) {
    setProjectId(val)
    setTaskId('')
  }

  const visibleTasks =
    projectId === ''     ? tasks :
    projectId === 'none' ? tasks.filter(t => !t.project_id) :
                           tasks.filter(t => String(t.project_id) === projectId)

  function handleTaskChange(id) {
    setTaskId(id)
    if (id && projectId === '') {
      const t = tasks.find(t => String(t.id) === id)
      setProjectId(t?.project_id ? String(t.project_id) : 'none')
    }
  }

  const resolvedProjectId = (projectId === 'none' || projectId === '') ? null : Number(projectId)
  const minutes = parseDurationToMinutes(duration)

  return (
    <div className="space-y-4">
      {/* Project */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Project (optional)</label>
        <select value={projectId} onChange={e => handleProjectChange(e.target.value)} className={fieldCls}>
          <option value="">— Select a project —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="none">No Project (unassigned tasks)</option>
        </select>
      </div>

      {/* Task */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Task (optional)</label>
        <select value={taskId} onChange={e => handleTaskChange(e.target.value)} className={fieldCls}>
          <option value="">No specific task</option>
          {visibleTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {/* Date + Start Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">Start Time *</label>
          <select value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldCls}>
            {TIME_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Duration * <span className="text-zinc-700">(e.g. 1h 30m)</span>
        </label>
        <input
          autoFocus
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="1h 30m"
          className={fieldCls}
        />
        {duration && (
          <p className={`text-[10px] mt-1 ${minutes > 0 ? 'text-indigo-400' : 'text-red-400'}`}>
            {minutes > 0 ? `= ${formatMinutes(minutes)}` : 'Invalid format'}
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Note (optional)</label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What did you work on?"
          className={fieldCls}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!minutes || !date || !startTime || loading}
          onClick={() => onSubmit({
            task_id:      taskId ? Number(taskId) : null,
            project_id:   resolvedProjectId,
            date,
            start_time:   startTime,
            duration_min: minutes,
            note,
          })}
          className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500
            disabled:opacity-40 rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Log Time'}
        </button>
      </div>
    </div>
  )
}

// ── Calendar entry block ───────────────────────────────────────────
function CalBlock({ entry, col, totalCols, onDelete }) {
  const top    = minToTop(timeToMin(entry.start_time))
  const height = Math.max((entry.duration_min / 30) * SLOT_H, 20)
  const color  = entry.is_break ? '#71717a' : (entry.project_color || '#6366f1')

  return (
    <div
      className="absolute rounded overflow-hidden group select-none"
      style={{
        top:    `${top}px`,
        height: `${height}px`,
        left:   `calc(${(col / totalCols) * 100}% + 1px)`,
        width:  `calc(${100 / totalCols}% - 3px)`,
        backgroundColor: color + '28',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="px-1.5 pt-0.5 overflow-hidden h-full">
        <p className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>
          {entry.is_break ? '☕ Break' : (entry.project_name || 'No Project')}
        </p>
        {height > 32 && (
          <p className="text-[9px] text-zinc-400 truncate">{entry.task_title || entry.note || ''}</p>
        )}
        {height > 52 && (
          <p className="text-[9px] text-zinc-500">{formatMinutes(entry.duration_min)}</p>
        )}
      </div>
      <button
        onClick={() => { if (confirm('Delete this entry?')) onDelete(entry.id) }}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100
          text-zinc-600 hover:text-red-400 transition-all"
      >
        <X size={10} />
      </button>
    </div>
  )
}

// ── Calendar view ──────────────────────────────────────────────────
const HOURS = Array.from({ length: NUM_HOURS }, (_, i) => CAL_START + i)

function CalendarView({ weekDays, weekEntries, onDelete }) {
  const byDate = useMemo(() => {
    const map = {}
    weekDays.forEach(d => { map[d] = { scheduled: [], unscheduled: [] } })
    weekEntries.forEach(e => {
      if (!map[e.date]) return
      if (e.start_time) map[e.date].scheduled.push(e)
      else              map[e.date].unscheduled.push(e)
    })
    return map
  }, [weekEntries, weekDays])

  const hasUnscheduled = weekDays.some(d => byDate[d].unscheduled.length > 0)
  const today = todayISO()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day column headers */}
      <div className="shrink-0 flex border-b border-zinc-800 bg-zinc-900">
        <div className="w-14 shrink-0 border-r border-zinc-800" />
        {weekDays.map(dateStr => {
          const isToday = dateStr === today
          return (
            <div key={dateStr}
              className="flex-1 py-2 text-center border-r border-zinc-800 last:border-r-0">
              <p className={`text-[10px] uppercase tracking-wider font-medium
                ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>
                {format(parseISO(dateStr), 'EEE')}
              </p>
              <p className={`text-sm font-bold mt-0.5
                ${isToday ? 'text-indigo-300' : 'text-zinc-300'}`}>
                {format(parseISO(dateStr), 'd')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${GRID_H}px` }}>

          {/* Time labels */}
          <div className="w-14 shrink-0 relative border-r border-zinc-800">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-0 w-full flex justify-end pr-2"
                style={{ top: `${(h - CAL_START) * HOUR_H - 8}px` }}
              >
                <span className="text-[10px] text-zinc-600">{hourLabel(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(dateStr => {
            const { scheduled } = byDate[dateStr]
            const laid = layoutDay(scheduled)
            const isToday = dateStr === today
            return (
              <div
                key={dateStr}
                className={`flex-1 relative border-r border-zinc-800 last:border-r-0
                  ${isToday ? 'bg-indigo-950/10' : ''}`}
                style={{ height: `${GRID_H}px` }}
              >
                {/* Hour gridlines */}
                {HOURS.map(h => (
                  <div key={h}>
                    <div
                      className="absolute left-0 right-0 border-t border-zinc-800/70"
                      style={{ top: `${(h - CAL_START) * HOUR_H}px` }}
                    />
                    <div
                      className="absolute left-0 right-0 border-t border-zinc-800/30"
                      style={{ top: `${(h - CAL_START) * HOUR_H + SLOT_H}px` }}
                    />
                  </div>
                ))}

                {/* Entry blocks */}
                {laid.map(e => (
                  <CalBlock
                    key={e.id}
                    entry={e}
                    col={e.col}
                    totalCols={e.totalCols}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled strip */}
      {hasUnscheduled && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80">
          <div className="flex">
            <div className="w-14 shrink-0 border-r border-zinc-800 px-1 py-2 flex items-center justify-end">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wide">No time</span>
            </div>
            {weekDays.map(dateStr => (
              <div key={dateStr}
                className="flex-1 border-r border-zinc-800 last:border-r-0 p-1 flex flex-col gap-0.5 min-h-[32px]">
                {byDate[dateStr].unscheduled.map(e => (
                  <div
                    key={e.id}
                    className="rounded px-1.5 py-0.5 text-[9px] truncate leading-tight"
                    style={{
                      backgroundColor: (e.project_color || '#6366f1') + '22',
                      borderLeft: `2px solid ${e.project_color || '#6366f1'}`,
                      color: e.project_color || '#818cf8',
                    }}
                  >
                    {e.project_name || e.note || 'Entry'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── List view entry row ────────────────────────────────────────────
function EntryRow({ entry, onDelete }) {
  return (
    <div className="grid grid-cols-[72px_120px_1fr_110px_80px_32px] gap-3 items-center px-4 py-3
      border-b border-zinc-800/50 hover:bg-zinc-800/30 group transition-colors text-sm">
      <span className="text-zinc-500 text-xs font-mono">{entry.start_time || '—'}</span>
      <span className="text-zinc-400 text-xs truncate">
        {entry.task_title || <span className="text-zinc-700 italic">—</span>}
      </span>
      <span className="flex items-center gap-1.5 min-w-0">
        {entry.project_color && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.project_color }} />
        )}
        <span className="text-zinc-500 text-xs truncate">{entry.project_name || '—'}</span>
      </span>
      <span className="text-indigo-300 font-semibold text-sm">{formatMinutes(entry.duration_min)}</span>
      <span className="text-zinc-500 text-xs truncate">{entry.note || '—'}</span>
      <button
        onClick={() => onDelete(entry.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function TimeLog() {
  const qc = useQueryClient()
  const [view,       setView]      = useState('calendar')
  const [modalOpen,  setModalOpen] = useState(false)
  const [weekStart,  setWeekStart] = useState(weekStartISO())
  // List view filters
  const [dateFrom,   setDateFrom]  = useState('')
  const [dateTo,     setDateTo]    = useState('')
  const [projFilter, setProjFilter] = useState('')

  const today      = todayISO()
  const curWeekStart = weekStartISO()
  const monthStart = monthStartISO()

  const { data: allEntries = [] } = useQuery({
    queryKey: ['time-entries'],
    queryFn: () => getTimeEntries({}),
  })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const { data: tasksRaw = [] } = useQuery({ queryKey: ['tasks', {}], queryFn: () => getTasks({}) })
  const tasks = tasksRaw.filter(t => t.status !== 'done' && t.status !== 'cancelled')

  const createMutation = useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['time-entries'] }); setModalOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })

  // KPIs
  const todayMin = sumMinutes(allEntries.filter(e => e.date === today))
  const weekMin  = sumMinutes(allEntries.filter(e => e.date >= curWeekStart))
  const monthMin = sumMinutes(allEntries.filter(e => e.date >= monthStart))

  // Calendar week
  const weekDays    = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekEntries = useMemo(() => allEntries.filter(e => weekDays.includes(e.date)), [allEntries, weekDays])

  // List view
  const filtered = useMemo(() => allEntries.filter(e => {
    if (dateFrom   && e.date < dateFrom)                   return false
    if (dateTo     && e.date > dateTo)                     return false
    if (projFilter && String(e.project_id) !== projFilter) return false
    return true
  }), [allEntries, dateFrom, dateTo, projFilter])

  const grouped       = groupByDate(filtered)
  const sortedDates   = Object.keys(grouped).sort().reverse()
  const totalFiltered = sumMinutes(filtered)

  const inputCls =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 ' +
    'focus:outline-none focus:border-indigo-500 transition-colors'

  const weekLabel =
    `${format(parseISO(weekDays[0]), 'MMM d')} – ${format(parseISO(weekDays[4]), 'MMM d, yyyy')}`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" /> Schedule
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Track time spent across tasks and projects</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${view === 'calendar' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <CalendarDays size={13} /> Calendar
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${view === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List size={13} /> List
              </button>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
                text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={14} /> Log Time
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Today',      value: todayMin, color: 'text-zinc-300'    },
            { label: 'This Week',  value: weekMin,  color: 'text-indigo-300'  },
            { label: 'This Month', value: monthMin, color: 'text-emerald-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{formatMinutes(value)}</p>
            </div>
          ))}
        </div>

        {/* Calendar: week nav | List: filters */}
        {view === 'calendar' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart(w => shiftWeek(w, -1))}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium text-zinc-300 w-48 text-center">{weekLabel}</span>
            <button
              onClick={() => setWeekStart(w => shiftWeek(w, 1))}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
            {weekStart !== curWeekStart && (
              <button
                onClick={() => setWeekStart(curWeekStart)}
                className="ml-1 text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1
                  rounded-lg hover:bg-indigo-500/10 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={inputCls} title="From date" />
            <span className="text-zinc-600 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={inputCls} title="To date" />
            <select value={projFilter} onChange={e => setProjFilter(e.target.value)} className={inputCls}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {(dateFrom || dateTo || projFilter) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setProjFilter('') }}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden">
        {view === 'calendar' ? (
          <CalendarView
            weekDays={weekDays}
            weekEntries={weekEntries}
            onDelete={id => deleteMutation.mutate(id)}
          />
        ) : (
          <div className="h-full overflow-auto px-6 py-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                <Hourglass size={36} className="mb-3 opacity-30" />
                <p className="text-sm">No time entries yet.</p>
                <p className="text-xs mt-1">Click "Log Time" to add your first entry.</p>
              </div>
            ) : (
              <>
                {sortedDates.map(date => {
                  const dayEntries = grouped[date]
                  const dayTotal   = sumMinutes(dayEntries)
                  return (
                    <div key={date} className="mb-4">
                      <div className="flex items-center justify-between px-4 py-2
                        bg-zinc-800/40 border border-zinc-800 rounded-t-xl">
                        <span className="text-xs font-semibold text-zinc-400">
                          {format(parseISO(date), 'EEEE, MMM d')}
                        </span>
                        <span className="text-xs font-bold text-indigo-300">
                          {formatMinutes(dayTotal)}
                        </span>
                      </div>
                      <div className="grid grid-cols-[72px_120px_1fr_110px_80px_32px] gap-3 px-4 py-2
                        bg-zinc-900 border-x border-zinc-800
                        text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                        <span>Start</span>
                        <span>Task</span>
                        <span>Project</span>
                        <span>Duration</span>
                        <span>Note</span>
                        <span />
                      </div>
                      <div className="bg-zinc-900 border-x border-b border-zinc-800 rounded-b-xl overflow-hidden">
                        {dayEntries.map(entry => (
                          <EntryRow
                            key={entry.id}
                            entry={entry}
                            onDelete={id => { if (confirm('Delete this entry?')) deleteMutation.mutate(id) }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-end px-4 py-2 text-sm text-zinc-500">
                  Total shown:&nbsp;
                  <span className="text-indigo-300 font-bold ml-1">{formatMinutes(totalFiltered)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Log Time modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Time">
        <LogTimeForm
          projects={projects}
          tasks={tasks}
          onSubmit={data => createMutation.mutate(data)}
          onCancel={() => setModalOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>
    </div>
  )
}
