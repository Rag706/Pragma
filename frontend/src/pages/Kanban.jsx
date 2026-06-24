import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { getTasks, updateTaskStatus } from '../api/tasks'
import { getProjects } from '../api/projects'
import TaskDrawer from '../components/TaskDrawer'
import QuickAdd from '../components/QuickAdd'
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns'

const COLUMNS = [
  { key: 'backlog',     label: 'Backlog',     statuses: ['backlog', 'planning'],                        hex: '#52525b' },
  { key: 'todo',        label: 'To Do',       statuses: ['todo'],                                       hex: '#71717a' },
  { key: 'up_next',     label: 'Up Next',     statuses: ['up_next'],                                     hex: '#fbbf24' },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress', 'blocked', 'waiting', 'on_hold'], hex: '#818cf8' },
  { key: 'review',      label: 'Review',      statuses: ['review', 'testing'],                          hex: '#a78bfa' },
  { key: 'done',        label: 'Done',        statuses: ['done'],                                       hex: '#34d399' },
  { key: 'cancelled',   label: 'Cancelled',   statuses: ['cancelled'],                                  hex: '#3f3f46' },
]

const COL_TEXT = {
  backlog: 'text-zinc-400', todo: 'text-zinc-400', up_next: 'text-amber-300',
  in_progress: 'text-indigo-300', review: 'text-violet-300',
  done: 'text-emerald-300', cancelled: 'text-zinc-600',
}

function hexToRgba(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function formatDue(due) {
  if (!due) return null
  try {
    const d = parseISO(due)
    if (isToday(d))    return { label: 'Today',    cls: 'text-yellow-400 bg-yellow-400/10' }
    if (isTomorrow(d)) return { label: 'Tomorrow', cls: 'text-zinc-400 bg-zinc-700/50'    }
    if (isPast(d))     return { label: `${Math.ceil((Date.now() - d) / 86400000)}d overdue`, cls: 'text-red-400 bg-red-500/10' }
    return { label: format(d, 'MMM d'), cls: 'text-zinc-500 bg-zinc-800' }
  } catch { return null }
}

export default function Kanban() {
  const qc = useQueryClient()
  const [projectFilter, setProjectFilter] = useState('')
  const [selectedTask, setSelectedTask]   = useState(null)
  const [quickAddOpen, setQuickAddOpen]   = useState(false)
  const [dragging, setDragging]           = useState(null)
  const [dragOver, setDragOver]           = useState(null)
  const [colWidths, setColWidths]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('pragma_col_widths') || '{}') }
    catch { return {} }
  })

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', { project_id: projectFilter || undefined }],
    queryFn:  () => getTasks(projectFilter ? { project_id: Number(projectFilter) } : {}),
  })

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTaskStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  function colTasks(col) {
    return allTasks.filter(t => col.statuses.includes(t.status))
  }

  function handleDragStart(e, task) {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e, colKey) {
    e.preventDefault()
    if (dragging && !COLUMNS.find(c => c.key === colKey)?.statuses.includes(dragging.status)) {
      statusMutation.mutate({ id: dragging.id, status: colKey })
    }
    setDragging(null)
    setDragOver(null)
  }

  const startResize = useCallback((e, colKey) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colKey] ?? 272

    function onMove(ev) {
      const w = Math.max(180, Math.min(520, startWidth + ev.clientX - startX))
      setColWidths(prev => {
        const next = { ...prev, [colKey]: w }
        localStorage.setItem('pragma_col_widths', JSON.stringify(next))
        return next
      })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [colWidths])

  // Refresh selected task from live data when drawer is open
  const liveSelectedTask = selectedTask
    ? (allTasks.find(t => t.id === selectedTask.id) ?? selectedTask)
    : null

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Kanban</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Drag cards between columns to update status</p>
        </div>
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center gap-3 shrink-0">
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-xs text-zinc-600">
          {isLoading ? 'Loading…' : `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-3.5 px-6 py-5 min-w-max">
          {COLUMNS.map(col => {
            const tasks  = colTasks(col)
            const isOver = dragOver === col.key
            const countBg = ['up_next', 'in_progress', 'review', 'done'].includes(col.key) && tasks.length > 0
              ? hexToRgba(col.hex, 0.15) : '#27272a'
            const countColor = ['up_next', 'in_progress', 'review', 'done'].includes(col.key) && tasks.length > 0
              ? col.hex : '#71717a'

            return (
              <div key={col.key} className="shrink-0 flex flex-col relative" style={{ width: colWidths[col.key] ?? 272 }}>
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-zinc-800 border-b-0 bg-zinc-900">
                  <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${COL_TEXT[col.key]}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.hex }} />
                    {col.label}
                  </div>
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: countBg, color: countColor }}
                  >
                    {tasks.length}
                  </span>
                </div>

                {/* Column body */}
                <div
                  className={`flex-1 overflow-y-auto rounded-b-xl border border-zinc-800 p-2 flex flex-col gap-2 min-h-[200px] transition-colors ${
                    isOver ? 'bg-zinc-800/50 border-zinc-600' : 'bg-zinc-900/40'
                  }`}
                  style={{ borderTop: `3px solid ${col.hex}`, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                  onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                  onDrop={e => handleDrop(e, col.key)}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
                >
                  {tasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      project={projectMap[task.project_id]}
                      isDragging={dragging?.id === task.id}
                      onDragStart={e => handleDragStart(e, task)}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}

                  {isOver && dragging && (
                    <div className="border-2 border-dashed border-zinc-600 rounded-lg h-12 flex items-center justify-center text-[11px] text-zinc-600 shrink-0">
                      Drop here
                    </div>
                  )}

                  {tasks.length === 0 && !isOver && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[11px] text-zinc-700">Empty</span>
                    </div>
                  )}
                </div>

                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-center group"
                  onMouseDown={e => startResize(e, col.key)}
                >
                  <div className="w-px h-12 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <QuickAdd
        open={quickAddOpen}
        defaultProjectId={projectFilter ? Number(projectFilter) : null}
        onOpen={() => setQuickAddOpen(true)}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(newTask) => setSelectedTask(newTask)}
      />

      <TaskDrawer
        task={liveSelectedTask}
        onClose={() => setSelectedTask(null)}
        onDeleted={() => setSelectedTask(null)}
        noBackdrop
      />
    </div>
  )
}

function KanbanCard({ task, project, isDragging, onDragStart, onDragEnd, onClick }) {
  const due    = formatDue(task.due_date)
  const isDone = task.status === 'done' || task.status === 'cancelled'

  const cardStyle = project ? {
    background:   hexToRgba(project.color, 0.09),
    borderColor:  hexToRgba(project.color, 0.28),
    borderLeft:   `3px solid ${hexToRgba(project.color, 0.55)}`,
  } : {}

  const hoverStyle = project
    ? `hover:border-opacity-60`
    : `hover:border-zinc-600`

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 cursor-pointer select-none
        transition-all hover:shadow-lg hover:shadow-black/40 ${isDragging ? 'opacity-40 cursor-grabbing' : ''}`}
      style={cardStyle}
    >
      {/* Title */}
      <p className={`text-[13px] leading-snug mb-2 ${isDone ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
        {task.title}
      </p>

      {/* Progress / checklist bar */}
      {task.checklist_items?.length > 0 ? (() => {
        const cl = task.checklist_items
        const clDone = cl.filter(i => i.checked).length
        const pct = Math.round(clDone / cl.length * 100)
        return (
          <div className="mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-zinc-700/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isDone ? 'bg-emerald-500/70' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-600 shrink-0">{clDone}/{cl.length}</span>
            </div>
          </div>
        )
      })() : task.progress > 0 && task.progress < 100 ? (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
            <span>Progress</span><span>{task.progress}%</span>
          </div>
          <div className="h-1 bg-zinc-700/60 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      ) : null}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${tag.color}22`, color: tag.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tag.color }} />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: project + priority + due */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/[0.06]">
        {project ? (
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-300 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <span className="truncate max-w-[108px]">{project.name}</span>
          </span>
        ) : <span />}

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {task.priority && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              task.priority === 'high'   ? 'bg-red-500/15 text-red-400'     :
              task.priority === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                                           'bg-emerald-500/15 text-emerald-400'
            }`}>
              {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Med' : 'Low'}
            </span>
          )}
          {due ? (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${due.cls}`}>
              {due.label}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-700 px-1.5 py-0.5">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
