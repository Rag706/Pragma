import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle2, Circle, Clock, PauseCircle, XCircle, SlidersHorizontal, Trash, ArrowUpDown, ArrowUp, ArrowDown, Check, MoreHorizontal, HelpCircle, Archive, Lightbulb, Eye, FlaskConical, Ban, MinusCircle, ChevronDown, ChevronRight, Star, ArrowRight } from 'lucide-react'
import { getTasks, updateTask, updateTaskStatus, deleteTask, deleteAllTasks, bulkDeleteTasks, bulkUpdateTasks } from '../api/tasks'
import { getProjects } from '../api/projects'
import { StatusBadge, PriorityBadge, ProjectDot, STATUS_CONFIG, STATUS_GROUPS } from '../components/Badge'
import TaskDrawer from '../components/TaskDrawer'
import QuickAdd from '../components/QuickAdd'
import { useSettings } from '../context/SettingsContext'
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'
import clsx from 'clsx'

const STATUS_ICONS = {
  backlog:     <Archive      size={15} className="text-zinc-600"    />,
  todo:        <Circle       size={15} className="text-zinc-500"    />,
  up_next:     <ArrowRight   size={15} className="text-amber-400"   />,
  planning:    <Lightbulb    size={15} className="text-sky-400"     />,
  in_progress: <Clock        size={15} className="text-indigo-400"  />,
  review:      <Eye          size={15} className="text-violet-400"  />,
  testing:     <FlaskConical size={15} className="text-cyan-400"    />,
  done:        <CheckCircle2 size={15} className="text-emerald-400" />,
  blocked:     <Ban          size={15} className="text-rose-400"    />,
  on_hold:     <PauseCircle  size={15} className="text-amber-400"   />,
  waiting:     <HelpCircle   size={15} className="text-orange-400"  />,
  cancelled:   <MinusCircle  size={15} className="text-zinc-700"    />,
}

const STATUS_DESCRIPTIONS = {
  backlog:     'Not yet scheduled or prioritized',
  todo:        'Ready to start, but not urgent',
  up_next:     'Starting this very soon',
  in_progress: 'Actively being worked on now',
  review:      'Waiting for review or approval',
  done:        'Completed successfully',
  cancelled:   'No longer needed',
}

const STATUS_PICKER_OPTIONS = ['backlog', 'todo', 'up_next', 'in_progress', 'review', 'done', 'cancelled']

function StatusPicker({ taskId, currentStatus, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen(e) {
    e.stopPropagation()
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(o => !o)
  }

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} className="hover:scale-110 transition-transform" title="Change status">
        {STATUS_ICONS[currentStatus] ?? STATUS_ICONS.todo}
      </button>

      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }}
          className="w-52 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-zinc-700/60">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Change Status</p>
          </div>
          {STATUS_PICKER_OPTIONS.map(value => {
            const cfg = STATUS_CONFIG[value]
            const isCurrent = value === currentStatus
            return (
              <button
                key={value}
                onClick={() => { onStatusChange(value); setOpen(false) }}
                className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                  isCurrent ? 'bg-zinc-700/60' : 'hover:bg-zinc-700/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{STATUS_DESCRIPTIONS[value]}</div>
                </div>
                {isCurrent && <span className="text-indigo-400 text-xs mt-0.5">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

function hexToRgba(hex, a) {
  const h = (hex || '#f59e0b').replace('#', '')
  const r = parseInt(h.slice(0,2), 16)
  const g = parseInt(h.slice(2,4), 16)
  const b = parseInt(h.slice(4,6), 16)
  return `rgba(${r},${g},${b},${a})`
}
// Visual hierarchy: #1 = solid filled, #2 = tinted, #3 = ghost
function rankBadgeStyle(color, rank) {
  const c = color || '#f59e0b'
  if (rank === 1) return { background: c, color: '#fff', border: `1px solid ${c}` }
  if (rank === 2) return { background: hexToRgba(c, 0.18), color: c, border: `1px solid ${hexToRgba(c, 0.40)}` }
  return { background: hexToRgba(c, 0.08), color: hexToRgba(c, 0.55), border: `1px solid ${hexToRgba(c, 0.20)}` }
}
const RANK_ROW_A    = { 1: 0.12, 2: 0.05, 3: 0.02 }
const RANK_HOVER_A  = { 1: 0.16, 2: 0.08, 3: 0.04 }
const RANK_BORDER_A = { 1: 1.00, 2: 0.45, 3: 0.20 }

function RankPicker({ currentRank, projectColor = '#f59e0b', onRankChange, asBadge = false, alwaysVisible = false }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen(e) {
    e.stopPropagation()
    const rect = btnRef.current.getBoundingClientRect()
    const popupW = 152
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8))
    setPos({ top: rect.bottom + 4, left })
    setOpen(o => !o)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        title={currentRank ? `Rank #${currentRank} — click to change` : 'Set rank'}
        className={clsx(
          asBadge && currentRank
            ? 'inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded shrink-0 transition-opacity hover:opacity-75 border-0 cursor-pointer'
            : currentRank
            ? 'w-6 h-6 flex items-center justify-center rounded text-[11px] font-black transition-all leading-none'
            : alwaysVisible
            ? 'text-[14px] font-normal transition-colors text-zinc-700 hover:text-zinc-500 leading-none'
            : 'w-6 h-6 flex items-center justify-center rounded text-[11px] font-black transition-all leading-none opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-amber-400'
        )}
        style={asBadge && currentRank ? rankBadgeStyle(projectColor, currentRank) : currentRank ? { color: projectColor } : {}}
      >
        {currentRank ? `#${currentRank}` : alwaysVisible ? '—' : <Star size={13} />}
      </button>

      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }}
          className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl p-1.5"
          onClick={e => e.stopPropagation()}
        >
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => { onRankChange(currentRank === n ? null : n); setOpen(false) }}
              className="w-7 h-7 rounded-md text-[11px] font-black border transition-all"
              style={currentRank === n
                ? { ...rankBadgeStyle(projectColor, n), borderRadius: 6 }
                : { color: '#71717a', borderColor: 'transparent' }
              }
            >
              #{n}
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-700 mx-0.5" />
          <button
            onClick={() => { onRankChange(null); setOpen(false) }}
            title="Remove rank"
            className="w-7 h-7 rounded-md text-xs text-zinc-500 hover:text-red-400 border border-transparent hover:border-zinc-700 transition-all flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}

const STATUS_CYCLE = {
  backlog:     'todo',
  todo:        'up_next',
  up_next:     'in_progress',
  planning:    'in_progress',
  in_progress: 'review',
  review:      'testing',
  testing:     'done',
  done:        'todo',
  blocked:     'in_progress',
  on_hold:     'todo',
  waiting:     'todo',
  cancelled:   'backlog',
}

function formatDue(dateStr) {
  if (!dateStr) return null
  try {
    const d    = parseISO(dateStr)
    const today = new Date(); today.setHours(0,0,0,0)
    const diff  = differenceInDays(d, today)
    if (isToday(d))     return { label: 'Today',         overdue: false }
    if (isTomorrow(d))  return { label: 'Tomorrow',      overdue: false }
    if (diff > 1 && diff <= 7) return { label: `In ${diff}d`,    overdue: false }
    if (diff < 0)       return { label: `${-diff}d overdue`,     overdue: true  }
    return { label: format(d, 'MMM d'), overdue: false }
  } catch {
    return { label: dateStr, overdue: false }
  }
}

export default function Tasks() {
  const { settings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const [selectedTask, setSelectedTask]   = useState(null)
  const [selectedIds,  setSelectedIds]    = useState(new Set())
  const [quickAddOpen, setQuickAddOpen]   = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [showCompleted,  setShowCompleted]  = useState(false)
  const [rankedOnly,     setRankedOnly]     = useState(false)
  const menuRef = useRef(null)

  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pragma_task_col_widths') || 'null') || { project: 130, priority: 90, status: 90, due: 80 } }
    catch { return { project: 130, priority: 90, status: 90, due: 80 } }
  })

  const gridStyle = {
    gridTemplateColumns: `20px 28px 40px 1fr ${colWidths.project}px ${colWidths.priority}px ${colWidths.status}px ${colWidths.due}px 72px`
  }

  function startColResize(e, col) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[col]
    const mins   = { project: 80, priority: 65, status: 65, due: 55 }
    function onMove(ev) {
      const w = Math.max(mins[col], Math.min(320, startW + ev.clientX - startX))
      setColWidths(prev => {
        const next = { ...prev, [col]: w }
        localStorage.setItem('pragma_task_col_widths', JSON.stringify(next))
        return next
      })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // N key: open QuickAdd and close any open task drawer
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'n' && !quickAddOpen && !selectedTask && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [quickAddOpen, selectedTask])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function openTask(task) {
    setQuickAddOpen(false)
    setSelectedTask(task)
  }

  // ── All filter values read DIRECTLY from the URL ──────────────────
  // This is the fix for Bug 3: sidebar navigation changes the URL and
  // these values update automatically — no stale local state.
  const projectFilter  = searchParams.get('project')    ?? ''
  const statusFilter   = searchParams.get('status')     ?? ''
  const priorityFilter = searchParams.get('priority')   ?? ''
  const dueFilter      = searchParams.get('due_filter') ?? ''
  const search         = searchParams.get('search')     ?? ''
  const openTaskId     = searchParams.get('open')       ? Number(searchParams.get('open')) : null
  const autoNew        = searchParams.get('new') === '1'

  const [sortField, setSortField] = useState(() => settings.default_sort_field)
  const [sortDir,   setSortDir]   = useState(() => settings.default_sort_dir)

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // Local state only for the search input (so we can debounce keystrokes)
  const [searchInput, setSearchInput] = useState(search)

  // Sync searchInput when URL changes externally (e.g., "Clear filters")
  useEffect(() => { setSearchInput(search) }, [search])

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [projectFilter, statusFilter, priorityFilter, dueFilter, search])

  // Debounce: update URL 350ms after user stops typing in the search box
  useEffect(() => {
    const t = setTimeout(() => setFilter('search', searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  function setFilter(key, value) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )
  }

  function clearFilters() {
    setSearchInput('')
    setSearchParams({}, { replace: true })
  }

  // ── Data fetching ─────────────────────────────────────────────────
  const params = {
    ...(search        && { search }),
    ...(projectFilter && { project_id: projectFilter }),
    ...(statusFilter  && { status: statusFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
    ...(dueFilter     && { due_filter: dueFilter }),
  }

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => getTasks(params),
  })

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  // Auto-open drawer when navigated from dashboard with ?open=id
  useEffect(() => {
    if (!openTaskId || tasks.length === 0) return
    const target = tasks.find(t => t.id === openTaskId)
    if (target) {
      setSelectedTask(target)
      setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('open'); return n }, { replace: true })
    }
  }, [openTaskId, tasks])

  // Auto-open QuickAdd when navigated from Projects with ?new=1
  useEffect(() => {
    if (!autoNew) return
    setQuickAddOpen(true)
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('new'); return n }, { replace: true })
  }, [autoNew])

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
  const STATUS_ORDER   = { backlog: 0, todo: 1, planning: 2, in_progress: 3, review: 4, testing: 5, blocked: 6, on_hold: 7, waiting: 8, done: 9, cancelled: 10 }

  const sortedTasks = useMemo(() => {
    const copy = [...tasks]
    copy.sort((a, b) => {
      let av, bv
      if (sortField === 'due_date') {
        av = a.due_date ?? '9999-99-99'
        bv = b.due_date ?? '9999-99-99'
      } else if (sortField === 'priority') {
        av = PRIORITY_ORDER[a.priority] ?? 99
        bv = PRIORITY_ORDER[b.priority] ?? 99
      } else if (sortField === 'status') {
        av = STATUS_ORDER[a.status] ?? 99
        bv = STATUS_ORDER[b.status] ?? 99
      } else if (sortField === 'title') {
        av = a.title.toLowerCase()
        bv = b.title.toLowerCase()
      } else {
        av = a.created_at ?? ''
        bv = b.created_at ?? ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return copy
  }, [tasks, sortField, sortDir])

  const isCompletedFilter = statusFilter === 'done' || statusFilter === 'cancelled'

  const activeTasks = useMemo(() => {
    const base = isCompletedFilter
      ? sortedTasks
      : sortedTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
    if (!rankedOnly) return base
    return [...base.filter(t => t.rank != null)].sort((a, b) => a.rank - b.rank)
  }, [sortedTasks, isCompletedFilter, rankedOnly])

  const completedTasks = useMemo(() =>
    isCompletedFilter
      ? []
      : sortedTasks.filter(t => t.status === 'done' || t.status === 'cancelled'),
    [sortedTasks, isCompletedFilter]
  )

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTaskStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllTasks(projectFilter ? Number(projectFilter) : null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteTasks(ids),
    onSuccess: () => {
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }) => bulkUpdateTasks(ids, data),
    onSuccess: () => {
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const rankMutation = useMutation({
    mutationFn: ({ id, rank }) => updateTask(id, { rank }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === activeTasks.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(activeTasks.map((t) => t.id)))
  }

  // ── Derived values ────────────────────────────────────────────────
  const activeProject = projectFilter ? projectMap[Number(projectFilter)] : null
  const pageTitle     = activeProject ? activeProject.name : 'All Tasks'
  const hasFilters    = search || projectFilter || statusFilter || priorityFilter || dueFilter

  const deleteAllLabel = activeProject
    ? `Delete all tasks in "${activeProject.name}"`
    : 'Delete ALL tasks'

  function SortIcon({ field }) {
    if (sortField !== field) return <ArrowUpDown size={10} className="opacity-30" />
    return sortDir === 'asc' ? <ArrowUp size={10} className="text-indigo-400" /> : <ArrowDown size={10} className="text-indigo-400" />
  }

  const selectCls =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {activeProject && (
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeProject.color }} />
            )}
            <h1 className="text-base font-bold text-zinc-100">{pageTitle}</h1>
            <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
              {activeTasks.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <XCircle size={12} /> Clear filters
              </button>
            )}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5">
                <span className="text-xs text-zinc-400 font-medium shrink-0">{selectedIds.size} selected</span>
                <div className="w-px h-3 bg-zinc-700" />
                <select
                  className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  defaultValue=""
                  onChange={e => {
                    if (!e.target.value) return
                    bulkUpdateMutation.mutate({ ids: [...selectedIds], data: { status: e.target.value } })
                    e.target.value = ''
                  }}
                >
                  <option value="" disabled>Set status…</option>
                  {STATUS_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <div className="w-px h-3 bg-zinc-700" />
                <select
                  className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  defaultValue=""
                  onChange={e => {
                    if (!e.target.value) return
                    bulkUpdateMutation.mutate({ ids: [...selectedIds], data: { priority: e.target.value } })
                    e.target.value = ''
                  }}
                >
                  <option value="" disabled>Set priority…</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <div className="w-px h-3 bg-zinc-700" />
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.size} selected task${selectedIds.size > 1 ? 's' : ''}?\n\nThis cannot be undone.`))
                      bulkDeleteMutation.mutate([...selectedIds])
                  }}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                >
                  <Trash size={11} /> {bulkDeleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
            {/* ⋯ overflow menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="More options"
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-20 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      if (confirm(`⚠️ ${deleteAllLabel}?\n\nThis cannot be undone.`))
                        deleteAllMutation.mutate()
                    }}
                    disabled={deleteAllMutation.isPending || tasks.length === 0}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash size={12} />
                    {deleteAllMutation.isPending ? 'Deleting…' : deleteAllLabel}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setRankedOnly(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              rankedOnly
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <Star size={11} className={rankedOnly ? 'fill-amber-400 text-amber-400' : ''} />
            Ranked
          </button>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <select value={projectFilter} onChange={(e) => setFilter('project', e.target.value)} className={selectCls}>
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setFilter('status', e.target.value)} className={selectCls}>
            <option value="">All Statuses</option>
            {STATUS_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>

          <select value={priorityFilter} onChange={(e) => setFilter('priority', e.target.value)} className={selectCls}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select value={dueFilter} onChange={(e) => setFilter('due_filter', e.target.value)} className={selectCls}>
            <option value="">All Dates</option>
            <option value="today">Due Today</option>
            <option value="week">This Week</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 pt-4">
          <QuickAdd
            defaultProjectId={projectFilter ? Number(projectFilter) : null}
            open={quickAddOpen}
            onOpen={() => { setQuickAddOpen(true); setSelectedTask(null) }}
            onClose={() => setQuickAddOpen(false)}
            onCreated={(newTask) => setSelectedTask(newTask)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">Loading tasks…</div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <SlidersHorizontal size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No tasks here yet.</p>
            <p className="text-xs mt-1 text-zinc-700">
              {hasFilters ? 'Try adjusting your filters.' : 'Press N or click "Add task" above to get started.'}
            </p>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="grid gap-3 px-4 py-2.5 border-b border-zinc-800 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider" style={gridStyle}>
                <input
                  type="checkbox"
                  checked={activeTasks.length > 0 && selectedIds.size === activeTasks.length}
                  ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < activeTasks.length }}
                  onChange={toggleSelectAll}
                  className="accent-indigo-500 cursor-pointer"
                />
                <span />
                <span className="flex items-center justify-center"><Star size={9} /></span>
                <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-zinc-400 transition-colors text-left">Task <SortIcon field="title" /></button>
                <span className="relative flex items-center select-none">
                  Project
                  <div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" onMouseDown={e => startColResize(e, 'project')}>
                    <div className="w-0.5 h-4 bg-zinc-400 rounded-full" />
                  </div>
                </span>
                <button onClick={() => toggleSort('priority')} className="relative flex items-center gap-1 hover:text-zinc-400 transition-colors">
                  Priority <SortIcon field="priority" />
                  <div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" onMouseDown={e => startColResize(e, 'priority')}>
                    <div className="w-0.5 h-4 bg-zinc-400 rounded-full" />
                  </div>
                </button>
                <button onClick={() => toggleSort('status')} className="relative flex items-center gap-1 hover:text-zinc-400 transition-colors">
                  Status <SortIcon field="status" />
                  <div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" onMouseDown={e => startColResize(e, 'status')}>
                    <div className="w-0.5 h-4 bg-zinc-400 rounded-full" />
                  </div>
                </button>
                <button onClick={() => toggleSort('due_date')} className="relative flex items-center gap-1 hover:text-zinc-400 transition-colors">
                  Due <SortIcon field="due_date" />
                </button>
                <span />
              </div>

              {activeTasks.map((task) => {
                const proj       = task.project_id ? projectMap[task.project_id] : null
                const due        = formatDue(task.due_date)
                const isDone     = task.status === 'done' || task.status === 'cancelled'
                const isCancelled = task.status === 'cancelled'
                const isOverdue  = due?.overdue && !isDone
                const isChecked  = selectedIds.has(task.id)

                return (
                  <div
                    key={task.id}
                    className={clsx(
                      'grid gap-3 items-center px-4 py-3 border-b border-zinc-800/50 cursor-pointer group transition-colors relative',
                      isChecked           ? 'bg-indigo-950/20' :
                      !task.rank && isOverdue ? 'bg-red-500/5 hover:bg-red-500/10' :
                      !task.rank          ? 'hover:bg-zinc-800/40' : ''
                    )}
                    style={{
                      ...gridStyle,
                      ...(isChecked ? {} : task.rank ? {
                        backgroundColor: hexToRgba(proj?.color || '#f59e0b', RANK_ROW_A[task.rank]),
                        borderLeft: `3px solid ${hexToRgba(proj?.color || '#f59e0b', RANK_BORDER_A[task.rank])}`,
                      } : isOverdue ? { borderLeft: '3px solid #f87171' } : {})
                    }}
                    onMouseEnter={e => { if (!isChecked && task.rank) e.currentTarget.style.backgroundColor = hexToRgba(proj?.color || '#f59e0b', RANK_HOVER_A[task.rank]) }}
                    onMouseLeave={e => { if (!isChecked && task.rank) e.currentTarget.style.backgroundColor = hexToRgba(proj?.color || '#f59e0b', RANK_ROW_A[task.rank]) }}
                    onClick={() => openTask(task)}
                  >
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(task.id)}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                      <StatusPicker
                        taskId={task.id}
                        currentStatus={task.status}
                        onStatusChange={(status) => statusMutation.mutate({ id: task.id, status })}
                      />
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                      <RankPicker
                        currentRank={task.rank}
                        projectColor={proj?.color}
                        onRankChange={(rank) => rankMutation.mutate({ id: task.id, rank })}
                        asBadge={!!task.rank}
                        alwaysVisible
                      />
                    </div>

                    <span className="flex flex-col min-w-0 gap-1">
                      <span className={clsx('text-sm', isDone ? 'line-through text-zinc-600' : isCancelled ? 'line-through text-zinc-600' : 'text-zinc-200')}>
                        {task.title}
                      </span>
                      {task.checklist_items?.length > 0 ? (() => {
                        const cl = task.checklist_items
                        const clDone = cl.filter(i => i.checked).length
                        return (
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={clsx('h-full rounded-full', isDone ? 'bg-emerald-500/70' : 'bg-indigo-500/70')}
                                style={{ width: `${Math.round(clDone / cl.length * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-600 shrink-0">{clDone}/{cl.length}</span>
                          </div>
                        )
                      })() : task.progress > 0 ? (
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', isDone ? 'bg-emerald-500' : 'bg-indigo-500')}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      ) : null}
                      {task.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${tag.color}22`, color: tag.color }}
                            >
                              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: tag.color }} />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </span>

                    <span>
                      {proj
                        ? <ProjectDot color={proj.color} name={proj.name} />
                        : <span className="text-xs text-zinc-700">—</span>}
                    </span>

                    <PriorityBadge priority={task.priority} />
                    <StatusBadge   status={task.status} statusNote={task.status_note} />

                    <span className={clsx('text-xs', due?.overdue ? 'text-red-400 font-medium' : 'text-zinc-500')}>
                      {due?.label ?? '—'}
                    </span>

                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {!isDone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            statusMutation.mutate({ id: task.id, status: 'done' })
                          }}
                          title="Mark as done"
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-emerald-400 transition-all"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete task?')) deleteMutation.mutate(task.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Completed & Cancelled collapsible section */}
              {!isCompletedFilter && completedTasks.length > 0 && (
                <>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-zinc-800/30 border-t border-zinc-800 select-none group/div transition-colors"
                    onClick={() => setShowCompleted(o => !o)}
                  >
                    {showCompleted
                      ? <ChevronDown  size={12} className="text-zinc-500" />
                      : <ChevronRight size={12} className="text-zinc-500" />}
                    <span className="text-xs font-medium text-zinc-500 group-hover/div:text-zinc-400 transition-colors">
                      Completed &amp; Cancelled
                    </span>
                    <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full ml-0.5">
                      {completedTasks.length}
                    </span>
                  </div>

                  {showCompleted && completedTasks.map((task) => {
                    const proj      = task.project_id ? projectMap[task.project_id] : null
                    const due       = formatDue(task.due_date)
                    const isChecked = selectedIds.has(task.id)

                    return (
                      <div
                        key={task.id}
                        className={clsx(
                          'grid gap-3 items-center px-4 py-3 border-b border-zinc-800/50 cursor-pointer group transition-all relative opacity-50 hover:opacity-80',
                          isChecked ? 'bg-indigo-950/20' : 'hover:bg-zinc-800/40'
                        )}
                        style={gridStyle}
                        onClick={() => openTask(task)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-indigo-500 cursor-pointer"
                        />
                        <StatusPicker
                          taskId={task.id}
                          currentStatus={task.status}
                          onStatusChange={(status) => statusMutation.mutate({ id: task.id, status })}
                        />

                        <span />

                        <span className="flex flex-col min-w-0 gap-1">
                          <span className="text-sm line-through text-zinc-600">
                            {task.title}
                          </span>
                          {task.checklist_items?.length > 0 && (() => {
                            const cl = task.checklist_items
                            const clDone = cl.filter(i => i.checked).length
                            return (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${Math.round(clDone / cl.length * 100)}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-700 shrink-0">{clDone}/{cl.length}</span>
                              </div>
                            )
                          })()}
                          {task.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.map(tag => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: `${tag.color}22`, color: tag.color }}
                                >
                                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: tag.color }} />
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </span>

                        <span>
                          {proj
                            ? <ProjectDot color={proj.color} name={proj.name} />
                            : <span className="text-xs text-zinc-700">—</span>}
                        </span>

                        <PriorityBadge priority={task.priority} />
                        <StatusBadge   status={task.status} statusNote={task.status_note} />

                        <span className="text-xs text-zinc-600">
                          {due?.label ?? '—'}
                        </span>

                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Delete task?')) deleteMutation.mutate(task.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onDeleted={() => setSelectedTask(null)}
      />
    </div>
  )
}
