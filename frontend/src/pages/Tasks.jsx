import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle2, Circle, Clock, PauseCircle, XCircle, SlidersHorizontal, Trash, ArrowUpDown, ArrowUp, ArrowDown, Check, MoreHorizontal, HelpCircle, Archive, Lightbulb, Eye, FlaskConical, Ban, MinusCircle, ChevronDown, ChevronRight, Star, ArrowRight, StickyNote, Plus, GripHorizontal, Bot, Loader2 } from 'lucide-react'
import { getTasks, updateTask, updateTaskStatus, deleteTask, deleteAllTasks, bulkDeleteTasks, bulkUpdateTasks } from '../api/tasks'
import { getProjects } from '../api/projects'
import { getProjectNotes, createNote, updateNote, deleteNote, reorderNotes } from '../api/notes'
import { getProjectLogs, createProjectLog, deleteProjectLog } from '../api/projectLogs'
import RichTextEditor from '../components/RichTextEditor'
import { PriorityBadge, ProjectDot, STATUS_CONFIG, STATUS_GROUPS } from '../components/Badge'
import TaskDrawer from '../components/TaskDrawer'
import QuickAdd from '../components/QuickAdd'
import { useSettings } from '../context/SettingsContext'
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'
import clsx from 'clsx'

const NOTE_COLORS = [
  { name: 'Zinc',   accent: '#a1a1aa' },
  { name: 'Red',    accent: '#fca5a5' },
  { name: 'Orange', accent: '#fdba74' },
  { name: 'Amber',  accent: '#fcd34d' },
  { name: 'Green',  accent: '#6ee7b7' },
  { name: 'Sky',    accent: '#7dd3fc' },
  { name: 'Violet', accent: '#c4b5fd' },
  { name: 'Pink',   accent: '#f9a8d4' },
]

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

const STATUS_BORDER = {
  backlog:     '#52525b', todo:        '#71717a', up_next:     '#fbbf24',
  planning:    '#38bdf8', in_progress: '#818cf8', review:      '#a78bfa',
  testing:     '#22d3ee', done:        '#34d399', blocked:     '#fb7185',
  on_hold:     '#fbbf24', waiting:     '#fb923c', cancelled:   '#3f3f46',
}
const STATUS_ROW_BG = {
  backlog:     'rgba(82,82,91,0.03)',    todo:        'rgba(113,113,122,0.03)',
  up_next:     'rgba(251,191,36,0.04)',  planning:    'rgba(56,189,248,0.04)',
  in_progress: 'rgba(129,140,248,0.04)',review:      'rgba(167,139,250,0.04)',
  testing:     'rgba(34,211,238,0.04)', done:        'rgba(52,211,153,0.03)',
  blocked:     'rgba(251,113,133,0.04)',on_hold:     'rgba(251,191,36,0.04)',
  waiting:     'rgba(251,146,60,0.04)', cancelled:   'rgba(63,63,70,0.02)',
}
const STATUS_ROW_BG_HOVER = {
  backlog:     'rgba(82,82,91,0.06)',    todo:        'rgba(113,113,122,0.06)',
  up_next:     'rgba(251,191,36,0.07)',  planning:    'rgba(56,189,248,0.07)',
  in_progress: 'rgba(129,140,248,0.07)',review:      'rgba(167,139,250,0.07)',
  testing:     'rgba(34,211,238,0.07)', done:        'rgba(52,211,153,0.06)',
  blocked:     'rgba(251,113,133,0.07)',on_hold:     'rgba(251,191,36,0.07)',
  waiting:     'rgba(251,146,60,0.07)', cancelled:   'rgba(63,63,70,0.04)',
}
const STATUS_PILL_STYLE = {
  backlog:     { bg: '#3f3f46', color: '#a1a1aa' }, todo:        { bg: '#3f3f46', color: '#a1a1aa' },
  up_next:     { bg: '#fbbf24', color: '#18181b' }, planning:    { bg: '#38bdf8', color: '#18181b' },
  in_progress: { bg: '#818cf8', color: '#fff'    }, review:      { bg: '#a78bfa', color: '#fff'    },
  testing:     { bg: '#22d3ee', color: '#18181b' }, done:        { bg: '#34d399', color: '#18181b' },
  blocked:     { bg: '#fb7185', color: '#fff'    }, on_hold:     { bg: '#fbbf24', color: '#18181b' },
  waiting:     { bg: '#fb923c', color: '#fff'    }, cancelled:   { bg: '#27272a', color: '#71717a' },
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

function StatusPicker({ taskId, currentStatus, onStatusChange, variant = 'icon' }) {
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
      <button ref={btnRef} onClick={handleOpen} title="Change status"
        className={variant === 'pill' ? 'cursor-pointer' : 'hover:scale-110 transition-transform'}
      >
        {variant === 'pill' ? (() => {
          const s   = STATUS_PILL_STYLE[currentStatus] ?? STATUS_PILL_STYLE.todo
          const cfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.todo
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', minWidth: 88,
              padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
              background: s.bg, color: s.color,
            }}>
              {cfg.label}
            </span>
          )
        })() : (STATUS_ICONS[currentStatus] ?? STATUS_ICONS.todo)}
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

function formatDue(dateStr, isDone = false) {
  if (!dateStr) return null
  try {
    const d    = parseISO(dateStr)
    const today = new Date(); today.setHours(0,0,0,0)
    const diff  = differenceInDays(d, today)
    if (isToday(d))     return { label: 'Today',         overdue: false }
    if (isTomorrow(d))  return { label: 'Tomorrow',      overdue: false }
    if (diff > 1 && diff <= 7) return { label: `In ${diff}d`,    overdue: false }
    if (diff < 0)       return { label: isDone ? format(d, 'MMM d') : `${-diff}d overdue`, overdue: !isDone }
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
  const menuRef = useRef(null)
  const resizeHandleRef  = useRef(null)
  const taskListWidthRef = useRef(280)
  const [taskListWidth, setTaskListWidth] = useState(280)

  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pragma_task_col_widths') || 'null') || { project: 130, priority: 90, due: 80 } }
    catch { return { project: 130, priority: 90, due: 80 } }
  })

  const gridStyle = {
    gridTemplateColumns: `20px 40px 100px 1fr ${colWidths.project}px ${colWidths.priority}px ${colWidths.due}px 72px`
  }

  function startColResize(e, col) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[col]
    const mins   = { project: 80, priority: 65, due: 55 }
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

  // Resize: task list panel
  useEffect(() => {
    const handle = resizeHandleRef.current
    if (!handle) return
    let dragging = false, startX = 0, startW = 0
    function onDown(e) {
      dragging = true; startX = e.clientX; startW = taskListWidthRef.current
      document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
    }
    function onMove(e) {
      if (!dragging) return
      const w = Math.min(520, Math.max(180, startW + (e.clientX - startX)))
      taskListWidthRef.current = w; setTaskListWidth(w)
    }
    function onUp() { dragging = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    handle.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      handle.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

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

  // Clear task drawer and selection when project changes
  useEffect(() => { setSelectedTask(null) }, [projectFilter])

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
    return base
  }, [sortedTasks, isCompletedFilter])

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

  const favoriteMutation = useMutation({
    mutationFn: ({ id, is_focus }) => updateTask(id, { is_focus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  // ── Notes + Activity tabs (shown when a project filter is active) ──
  const [activeView,      setActiveView]      = useState('tasks') // 'tasks' | 'notes' | 'activity'
  const [selectedPageId,  setSelectedPageId]  = useState(null)
  const [pageTitle,       setPageTitle]       = useState('')
  const [pageBody,        setPageBody]        = useState('')
  const [localNotes,      setLocalNotes]      = useState([])
  const [dragPageId,      setDragPageId]      = useState(null)
  const [dragOverPageId,  setDragOverPageId]  = useState(null)

  // Reset to tasks view when project changes
  useEffect(() => { setActiveView('tasks'); setSelectedPageId(null) }, [projectFilter])

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', projectFilter],
    queryFn:  () => getProjectNotes(Number(projectFilter)),
    enabled:  !!projectFilter,
  })

  // ── Activity log state ─────────────────────────────────────────
  const [activityText, setActivityText] = useState('')

  const { data: projectLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['projectLogs', projectFilter],
    queryFn:  () => getProjectLogs(Number(projectFilter)),
    enabled:  !!projectFilter,
  })

  const addLogMutation = useMutation({
    mutationFn: (content) => createProjectLog(Number(projectFilter), { content, author: 'user' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectLogs', projectFilter] })
      setActivityText('')
    },
  })

  const deleteLogMutation = useMutation({
    mutationFn: (id) => deleteProjectLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projectLogs', projectFilter] }),
  })

  // Sync local order; auto-select first page on first load
  useEffect(() => {
    if (dragPageId !== null) return
    setLocalNotes(notes)
    if (notes.length > 0 && !selectedPageId) {
      setSelectedPageId(notes[0].id)
      setPageTitle(notes[0].title)
      setPageBody(notes[0].body)
    }
  }, [notes, dragPageId])

  const selectedPage = localNotes.find(n => n.id === selectedPageId) ?? null

  const createNoteMutation = useMutation({
    mutationFn: (data) => createNote(Number(projectFilter), data),
    onSuccess: (newNote) => {
      qc.invalidateQueries({ queryKey: ['notes', projectFilter] })
      setSelectedPageId(newNote.id)
      setPageTitle(newNote.title)
      setPageBody(newNote.body)
    },
  })
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => updateNote(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', projectFilter] }),
  })
  const deleteNoteMutation = useMutation({
    mutationFn: (id) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', projectFilter] })
      setSelectedPageId(null)
    },
  })
  const reorderMutation = useMutation({
    mutationFn: (ids) => reorderNotes(Number(projectFilter), ids),
  })

  function selectPage(note) {
    if (selectedPageId && selectedPageId !== note.id) {
      updateNoteMutation.mutate({ id: selectedPageId, data: { title: pageTitle, body: pageBody } })
    }
    setSelectedPageId(note.id)
    setPageTitle(note.title)
    setPageBody(note.body)
  }

  function addNewPage() { createNoteMutation.mutate({ title: '', body: '', color: '#a1a1aa' }) }

  function savePage() {
    if (!selectedPageId) return
    updateNoteMutation.mutate({ id: selectedPageId, data: { title: pageTitle, body: pageBody } })
  }

  function changePageColor(color) {
    if (!selectedPageId) return
    updateNoteMutation.mutate({ id: selectedPageId, data: { color } })
    setLocalNotes(prev => prev.map(n => n.id === selectedPageId ? { ...n, color } : n))
  }

  function handlePageDrop(targetId) {
    if (!dragPageId || dragPageId === targetId) return
    const reordered = [...localNotes]
    const fromIdx = reordered.findIndex(n => n.id === dragPageId)
    const toIdx   = reordered.findIndex(n => n.id === targetId)
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setLocalNotes(reordered)
    reorderMutation.mutate(reordered.map(n => n.id))
  }

  function openNotesTab() {
    setActiveView('notes')
    if (notes.length > 0 && !selectedPageId) {
      setSelectedPageId(notes[0].id)
      setPageTitle(notes[0].title)
      setPageBody(notes[0].body)
    }
  }

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
  const headerTitle   = activeProject ? activeProject.name : 'All Tasks'
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

      {/* Project-level tab bar — only when a project is active */}
      {activeProject && (
        <div className="flex items-stretch border-b border-zinc-800 bg-zinc-900 shrink-0" style={{ height: 38 }}>
          <button onClick={() => setActiveView('tasks')}
            className={`flex items-center gap-2 px-5 text-[12px] font-medium transition-colors border-t-2 ${activeView === 'tasks' ? 'border-indigo-500 bg-zinc-950 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'}`}>
            Tasks
          </button>
          <button onClick={openNotesTab}
            className={`flex items-center gap-2 px-5 text-[12px] font-medium transition-colors border-t-2 ${activeView === 'notes' ? 'border-indigo-500 bg-zinc-950 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'}`}>
            Notes
          </button>
        </div>
      )}

      {/* ── MAIN HORIZONTAL SPLIT ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── TASKS VIEW ── */}
        {(!activeProject || activeView === 'tasks') && (
          <>
            {/* Compact task list panel */}
            <div style={{ width: taskListWidth }} className="shrink-0 flex flex-col bg-[#0f0f12] border-r border-zinc-800 overflow-hidden">

              {/* Panel header */}
              <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[13px] font-semibold text-zinc-200">{headerTitle}</div>
                  <div className="text-[11px] text-zinc-500">{activeTasks.length} active</div>
                </div>
                <div className="flex items-center gap-0.5">
                  {hasFilters && (
                    <button onClick={clearFilters} title="Clear filters"
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                      <XCircle size={12} />
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => { if (confirm(`Delete ${selectedIds.size} task(s)?`)) bulkDeleteMutation.mutate([...selectedIds]) }}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors" title="Delete selected">
                      <Trash size={12} />
                    </button>
                  )}
                  <button onClick={() => setQuickAddOpen(o => !o)} title="Add task (N)"
                    className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-2 py-2 border-b border-zinc-800 shrink-0">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search tasks…"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-7 pr-2 py-1 text-[11.5px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto">
                {quickAddOpen && (
                  <div className="px-2 pt-2 shrink-0">
                    <QuickAdd
                      defaultProjectId={projectFilter ? Number(projectFilter) : null}
                      open={quickAddOpen}
                      onOpen={() => setQuickAddOpen(true)}
                      onClose={() => setQuickAddOpen(false)}
                      onCreated={t => { setSelectedTask(t); setQuickAddOpen(false) }}
                    />
                  </div>
                )}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-zinc-700 text-xs">Loading…</div>
                ) : activeTasks.length === 0 && !quickAddOpen ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-1 text-zinc-700">
                    <p className="text-xs">No tasks found.</p>
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-[11px] text-zinc-600 hover:text-zinc-400 underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <CompactTaskList
                    tasks={activeTasks}
                    completedTasks={completedTasks}
                    showCompleted={showCompleted}
                    setShowCompleted={setShowCompleted}
                    selectedTask={selectedTask}
                    onSelect={openTask}
                    isCompletedFilter={isCompletedFilter}
                  />
                )}
              </div>
            </div>

            {/* Resize handle */}
            <div ref={resizeHandleRef}
              className="w-1 shrink-0 bg-zinc-800 hover:bg-violet-500 active:bg-violet-400 cursor-col-resize transition-colors" />

            {/* Task detail */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0b0b0e]">
              {selectedTask ? (
                <TaskDrawer
                  task={selectedTask}
                  onClose={() => setSelectedTask(null)}
                  onDeleted={() => setSelectedTask(null)}
                  inline
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700">
                  <CheckCircle2 size={36} className="opacity-15" />
                  <p className="text-sm">Select a task to view details</p>
                  <p className="text-xs text-zinc-800">Press N to add a new task</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── NOTES VIEW ── */}
        {activeProject && activeView === 'notes' && (
          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="w-[210px] shrink-0 border-r border-zinc-800 bg-zinc-900/40 flex flex-col">
              <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pages</span>
                <button onClick={addNewPage} disabled={createNoteMutation.isPending}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 px-2 py-1 rounded-md transition-colors disabled:opacity-40">
                  <Plus size={11} /> New page
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {localNotes.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-[11px] text-zinc-700">No pages yet</div>
                ) : localNotes.map(note => (
                  <div
                    key={note.id}
                    draggable
                    onClick={() => selectPage(note)}
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragPageId(note.id) }}
                    onDragEnd={() => { setDragPageId(null); setDragOverPageId(null) }}
                    onDragOver={e => { e.preventDefault(); setDragOverPageId(note.id) }}
                    onDrop={e => { e.preventDefault(); handlePageDrop(note.id) }}
                    className={`flex items-center gap-0 cursor-pointer group transition-colors border-l-[3px] select-none ${
                      selectedPageId === note.id ? 'bg-zinc-800/70' :
                      dragOverPageId === note.id && dragPageId !== note.id ? 'bg-indigo-500/10' :
                      'hover:bg-zinc-800/40'
                    }`}
                    style={{ borderLeftColor: selectedPageId === note.id ? note.color : 'transparent' }}
                  >
                    <span className="pl-2 pr-1 text-zinc-700 group-hover:text-zinc-500 transition-colors cursor-grab">
                      <GripHorizontal size={12} />
                    </span>
                    <div className="w-[3px] h-7 rounded-sm mx-2 shrink-0" style={{ background: note.color }} />
                    <div className="flex-1 min-w-0 pr-2 py-2.5">
                      <div className={`text-[12px] truncate leading-snug ${selectedPageId === note.id ? 'text-zinc-100' : 'text-zinc-400'}`}>
                        {note.title || <span className="text-zinc-600 italic">Untitled</span>}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">
                        {note.created_at ? format(parseISO(note.created_at), 'MMM d') : ''}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (confirm('Delete this page?')) deleteNoteMutation.mutate(note.id) }}
                      className="opacity-0 group-hover:opacity-100 mr-2 p-1 text-zinc-600 hover:text-red-400 transition-all rounded shrink-0">
                      <XCircle size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {selectedPage ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                <div className="flex items-center gap-4 px-7 py-2.5 border-b border-zinc-800 shrink-0">
                  <div className="flex-1 text-[11px] text-zinc-600 truncate">
                    <span className="text-zinc-500">{activeProject.name}</span>
                    <span className="mx-1.5 text-zinc-700">›</span>
                    <span className="text-zinc-400">{selectedPage.title || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {NOTE_COLORS.map(c => (
                      <button key={c.accent} onClick={() => changePageColor(c.accent)} title={c.name}
                        className="w-3.5 h-3.5 rounded-full border-2 transition-all"
                        style={{ background: c.accent, borderColor: selectedPage.color === c.accent ? '#fff' : 'transparent', transform: selectedPage.color === c.accent ? 'scale(1.25)' : 'scale(1)' }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-700 shrink-0">
                    {updateNoteMutation.isPending ? 'Saving…' : 'Saved'}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col px-10 py-8">
                  <input
                    key={selectedPageId + '-title'}
                    defaultValue={pageTitle}
                    onChange={e => setPageTitle(e.target.value)}
                    onBlur={savePage}
                    placeholder="Page title…"
                    className="block w-full text-[26px] font-bold text-zinc-100 bg-transparent border-none outline-none caret-indigo-500 placeholder-zinc-700 mb-2"
                    style={{ fontFamily: 'inherit' }}
                  />
                  <div className="text-[11px] text-zinc-700 mb-6 pb-5 border-b border-zinc-800/60">
                    {selectedPage.created_at ? format(parseISO(selectedPage.created_at), 'MMM d, yyyy · HH:mm') : ''}
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <RichTextEditor
                      key={selectedPageId + '-body'}
                      content={selectedPage.body || ''}
                      onUpdate={setPageBody}
                      onBlur={savePage}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-700">
                <div className="text-center">
                  <StickyNote size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Create a new page to get started</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY VIEW ── */}
        {activeProject && activeView === 'activity' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-zinc-950">
            <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl w-full mx-auto">
              <h2 className="text-sm font-semibold text-zinc-400 mb-1">Project Activity Log</h2>
              <p className="text-[11px] text-zinc-600 mb-6">A shared timeline for notes, decisions, and updates — written by you or Claude.</p>
              <div className="flex gap-3 mb-8">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">Y</span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={activityText}
                    onChange={e => setActivityText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && activityText.trim()) addLogMutation.mutate(activityText.trim()) }}
                    rows={3}
                    placeholder="Add a note, decision, or update… (Ctrl+Enter to save)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                  <button
                    onClick={() => { if (activityText.trim()) addLogMutation.mutate(activityText.trim()) }}
                    disabled={!activityText.trim() || addLogMutation.isPending}
                    className="mt-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                    {addLogMutation.isPending ? 'Adding…' : 'Add Entry'}
                  </button>
                </div>
              </div>
              {logsLoading ? (
                <div className="flex items-center justify-center py-12 text-zinc-600">
                  <Loader2 size={16} className="animate-spin mr-2" /> Loading…
                </div>
              ) : projectLogs.length === 0 ? (
                <div className="text-center py-12 text-zinc-700">
                  <Bot size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity logged yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projectLogs.map(log => (
                    <div key={log.id} className="flex gap-3 group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${log.author === 'claude' ? 'bg-violet-700' : 'bg-indigo-600'}`}>
                        {log.author === 'claude' ? <Bot size={12} className="text-white" /> : <span className="text-[10px] font-bold text-white">Y</span>}
                      </div>
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[11px] font-semibold ${log.author === 'claude' ? 'text-violet-400' : 'text-indigo-400'}`}>
                            {log.author === 'claude' ? 'Claude' : 'You'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600">{format(parseISO(log.created_at), 'MMM d, yyyy · h:mm a')}</span>
                            <button onClick={() => deleteLogMutation.mutate(log.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-700 hover:text-red-400 transition-all rounded">
                              <XCircle size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{log.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>{/* end horizontal split */}
    </div>
  )
}

const COMPACT_CHIP = {
  in_progress: { color: '#818cf8', label: 'In Progress', tint: 'rgba(129,140,248,.05)' },
  up_next:     { color: '#fbbf24', label: 'Up Next',     tint: 'rgba(251,191,36,.04)'  },
  todo:        { color: '#71717a', label: 'To Do',       tint: 'rgba(113,113,122,.03)' },
  blocked:     { color: '#f87171', label: 'Blocked',     tint: 'rgba(248,113,133,.05)' },
  on_hold:     { color: '#f59e0b', label: 'On Hold',     tint: 'rgba(245,158,11,.04)'  },
  waiting:     { color: '#fb923c', label: 'Waiting',     tint: 'rgba(251,146,60,.04)'  },
  planning:    { color: '#38bdf8', label: 'Planning',    tint: 'rgba(56,189,248,.04)'  },
  review:      { color: '#a78bfa', label: 'Review',      tint: 'rgba(167,139,250,.04)' },
  testing:     { color: '#22d3ee', label: 'Testing',     tint: 'rgba(34,211,238,.04)'  },
  backlog:     { color: '#71717a', label: 'Backlog',     tint: 'rgba(113,113,122,.03)' },
}
const COMPACT_GROUP_ORDER = ['in_progress', 'up_next', 'todo', 'blocked', 'on_hold', 'waiting', 'planning', 'review', 'testing', 'backlog']

function CompactTaskList({ tasks, completedTasks, showCompleted, setShowCompleted, selectedTask, onSelect, isCompletedFilter }) {
  return (
    <div className="pb-4">
      {COMPACT_GROUP_ORDER.map(status => {
        const group = tasks.filter(t => t.status === status)
        if (!group.length) return null
        const chip = COMPACT_CHIP[status] ?? COMPACT_CHIP.todo
        // hex alpha 26 ≈ 15% opacity — appended to the 6-digit hex color
        const dimColor = chip.color + '26'
        return (
          <div key={status} className="mb-1.5">
            {/* Group header: colored label + fading divider + count badge */}
            <div className="flex items-center gap-2 px-2.5 pt-3 pb-1.5">
              <span className="text-[13px] font-bold uppercase tracking-wide shrink-0"
                style={{ color: chip.color }}>
                {chip.label}
              </span>
              <div className="flex-1 h-px" style={{ background: dimColor }} />
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: dimColor, color: chip.color }}>
                {group.length}
              </span>
            </div>
            {/* Group body: left border accent + subtle tint background */}
            <div style={{ borderLeft: `2px solid ${chip.color}`, background: chip.tint, marginLeft: 10, borderRadius: '0 3px 3px 0' }}>
              {group.map(task => {
                const isSelected = selectedTask?.id === task.id
                const cl = task.checklist_items ?? []
                const clDone = cl.filter(i => i.checked).length
                return (
                  <div
                    key={task.id}
                    onClick={() => onSelect(task)}
                    className="flex items-center gap-2 px-2.5 py-[5px] cursor-pointer transition-colors"
                    style={isSelected ? { background: 'rgba(249,115,22,.12)' } : {}}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
                  >
                    <div className={`w-[13px] h-[13px] rounded-full border shrink-0 transition-colors ${
                      isSelected ? 'border-orange-400' : 'border-zinc-600'
                    }`} />
                    <span className={`text-[10px] font-mono shrink-0 ${
                      isSelected ? 'text-orange-400/70' : 'text-zinc-600'
                    }`}>#{task.id}</span>
                    <span className={`text-[12.5px] truncate flex-1 leading-snug ${
                      isSelected ? 'text-amber-100' : 'text-zinc-300'
                    }`}>
                      {task.title}
                    </span>
                    {cl.length > 0 && (
                      <span className="text-[10px] text-orange-400 shrink-0 font-medium">{clDone}/{cl.length}</span>
                    )}
                    {task.is_focus && <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!isCompletedFilter && completedTasks.length > 0 && (
        <div className="mt-2 border-t border-zinc-800/60 pt-1">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer hover:bg-zinc-800/20 transition-colors select-none"
            onClick={() => setShowCompleted(o => !o)}
          >
            {showCompleted ? <ChevronDown size={11} className="text-zinc-600" /> : <ChevronRight size={11} className="text-zinc-600" />}
            <span className="text-[11px] text-zinc-600">Completed &amp; Cancelled</span>
            <span className="text-[10px] text-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 rounded-full">{completedTasks.length}</span>
          </div>
          {showCompleted && completedTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onSelect(task)}
              className="flex items-center gap-2 px-2.5 py-[5px] cursor-pointer border-l-2 border-l-transparent hover:bg-zinc-800/20 opacity-40 hover:opacity-60 transition-all"
            >
              <div className="w-[13px] h-[13px] rounded-full border border-zinc-700 shrink-0" />
              <span className="text-[10px] font-mono shrink-0 text-zinc-700">#{task.id}</span>
              <span className="text-[12px] truncate flex-1 text-zinc-500 line-through">{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
