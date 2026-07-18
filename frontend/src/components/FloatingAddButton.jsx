import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, ListTodo, StickyNote } from 'lucide-react'
import { createTask } from '../api/tasks'
import { createNote } from '../api/notes'
import { getProjects } from '../api/projects'
import { useSettings } from '../context/SettingsContext'

const TRAY_PROJECT_ID = 11

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fieldCls =
  'w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors'

// mode: 'task' | 'note' | 'simple'
export default function FloatingAddButton() {
  const [expanded,   setExpanded]   = useState(false)
  const [mode,       setMode]       = useState(null)   // null = closed
  const [title,      setTitle]      = useState('')
  const [body,       setBody]       = useState('')     // note body or task note
  const [projectId,  setProjectId]  = useState('')
  const [priority,   setPriority]   = useState('medium')
  const [dueDate,    setDueDate]    = useState('')
  const titleRef = useRef(null)

  const location       = useLocation()
  const [searchParams] = useSearchParams()
  const { settings }   = useSettings()
  const qc             = useQueryClient()

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const nonTrayProjects = projects.filter(p => p.id !== TRAY_PROJECT_ID)

  const taskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); close() },
  })

  const noteMutation = useMutation({
    mutationFn: ({ projectId: pid, data }) => createNote(pid, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); close() },
  })

  function open(m) {
    setExpanded(false)
    setTitle('')
    setBody('')
    setDueDate('')
    setPriority(settings.default_priority ?? 'medium')
    setProjectId(String(TRAY_PROJECT_ID))
    setMode(m)
    setTimeout(() => titleRef.current?.focus(), 60)
  }

  function close() {
    setMode(null)
    setExpanded(false)
  }

  function submitTask(e) {
    e?.preventDefault()
    if (!title.trim() || taskMutation.isPending) return
    taskMutation.mutate({
      title:      title.trim(),
      project_id: projectId ? Number(projectId) : TRAY_PROJECT_ID,
      priority,
      status:     settings.default_status ?? 'todo',
      due_date:   dueDate || null,
      notes:      body.trim() || '',
    })
  }

  function submitNote(e) {
    e?.preventDefault()
    if (!title.trim() || noteMutation.isPending) return
    const pid = projectId ? Number(projectId) : TRAY_PROJECT_ID
    noteMutation.mutate({ projectId: pid, data: { title: title.trim(), body: body.trim() } })
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      if (mode) close()
      else if (expanded) setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, expanded])

  const drawerOpen = mode !== null
  const isPending  = taskMutation.isPending || noteMutation.isPending

  const optionBtn =
    'flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 ' +
    'rounded-xl px-3 py-2 text-[12px] font-medium text-zinc-300 hover:text-zinc-100 ' +
    'transition-all cursor-pointer shadow-lg whitespace-nowrap'

  const drawerTitle = mode === 'task' ? 'Add Task' : mode === 'note' ? 'Add Note' : ''

  return createPortal(
    <>
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/25 z-[190]" onClick={close} />
      )}
      {expanded && !drawerOpen && (
        <div className="fixed inset-0 z-[180]" onClick={() => setExpanded(false)} />
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed bottom-24 right-6 z-[200] w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">{drawerTitle}</span>
              {mode === 'note' && (
                <span className="text-[10px] text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 px-2 py-px rounded-full">
                  → Tray
                </span>
              )}
            </div>
            <button onClick={close} className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <X size={14} />
            </button>
          </div>

          <form onSubmit={mode === 'note' ? submitNote : submitTask} className="p-4 space-y-3">
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={mode === 'note' ? 'Note title…' : 'Task title…'}
              className={fieldCls}
            />

            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={mode === 'note' ? 'Content…' : 'Notes… (optional)'}
              rows={mode === 'note' ? 4 : 2}
              className={fieldCls + ' resize-none'}
            />

            {/* Task: project + due date + priority */}
            {mode === 'task' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className={fieldCls}>
                    <option value={TRAY_PROJECT_ID}>Tray</option>
                    {nonTrayProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={fieldCls}>
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isPending}
                className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAB + options */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-2">
        {expanded && !drawerOpen && (
          <>
            <button className={optionBtn} onClick={() => open('task')}>
              <ListTodo size={13} className="text-indigo-400 shrink-0" />
              Add Task
            </button>
            <button className={optionBtn} onClick={() => open('note')}>
              <StickyNote size={13} className="text-violet-400 shrink-0" />
              Add Note
            </button>
          </>
        )}

        <button
          onClick={() => setExpanded(o => !o)}
          className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          title="Add"
        >
          <Plus
            size={18}
            color="white"
            style={{ transition: 'transform .2s', transform: expanded ? 'rotate(45deg)' : 'none' }}
          />
        </button>
      </div>
    </>,
    document.body
  )
}
