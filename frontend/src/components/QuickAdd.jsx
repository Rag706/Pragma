import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { createTask } from '../api/tasks'
import { getProjects } from '../api/projects'
import { STATUS_GROUPS } from './Badge'
import { useSettings } from '../context/SettingsContext'

const PRIORITIES = ['high', 'medium', 'low']

function localDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const fieldCls =
  'w-full bg-zinc-800 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors'

// QuickAdd accepts controlled open/onOpen/onClose props.
// The N key handler lives in the parent (Tasks.jsx) for coordination.
export default function QuickAdd({ defaultProjectId = null, open, onOpen, onClose, onCreated }) {
  const { settings } = useSettings()
  const [title,      setTitle]      = useState('')
  const [projectId,  setProjectId]  = useState(defaultProjectId ?? '')
  const [priority,   setPriority]   = useState(settings.default_priority)
  const [status,     setStatus]     = useState(settings.default_status)
  const [dueDate,    setDueDate]    = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [notes,      setNotes]      = useState('')
  const qc = useQueryClient()

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const showStatusNote = ['waiting', 'on_hold', 'blocked'].includes(status)

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setPriority(settings.default_priority)
      setStatus(settings.default_status)
      setDueDate('')
      setStartDate('')
      setStatusNote('')
      setNotes('')
      setProjectId(defaultProjectId ?? '')
    }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      onClose()
      onCreated?.(newTask)
    },
  })

  function submit(e) {
    e?.preventDefault()
    if (!title.trim()) return
    mutation.mutate({
      title:       title.trim(),
      project_id:  projectId ? Number(projectId) : null,
      priority,
      status,
      due_date:    dueDate || null,
      start_date:  startDate || null,
      status_note: statusNote || '',
      notes,
    })
  }

  return (
    <>
      {/* Trigger button */}
      <div className="mb-4">
        <button
          onClick={onOpen}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-zinc-500 hover:text-zinc-300 transition-all group"
        >
          <span className="w-5 h-5 rounded-md bg-zinc-800 group-hover:bg-indigo-500/20 flex items-center justify-center shrink-0 transition-colors">
            <Plus size={12} className="group-hover:text-indigo-400 transition-colors" />
          </span>
          <span className="text-sm flex-1 text-left">Add task…</span>
          <span className="text-[10px] bg-zinc-800 text-zinc-600 px-1.5 py-0.5 rounded font-mono group-hover:text-zinc-500 transition-colors">N</span>
        </button>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/15 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl
          flex flex-col transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <span className="text-sm font-semibold text-zinc-200">New Task</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Title *</label>
            <input
              autoFocus={open}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title…"
              className={fieldCls}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={fieldCls}>
                {STATUS_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={fieldCls}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={fieldCls}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Status Note (conditional) */}
          {showStatusNote && (
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">
                {status === 'waiting' ? 'Waiting on…' : status === 'blocked' ? 'Blocked by…' : 'Reason for hold…'}
              </label>
              <input
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder={status === 'waiting' ? 'Waiting on…' : status === 'blocked' ? 'Blocked by…' : 'Reason for hold…'}
                className={fieldCls}
                maxLength={200}
              />
            </div>
          )}

          {/* Due Date + Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={fieldCls}
              />
              <div className="flex gap-1 mt-1.5">
                {[['Today', 0], ['Tomorrow', 1], ['+7d', 7]].map(([label, offset]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDueDate(dueDate === localDate(offset) ? '' : localDate(offset))}
                    className={`flex-1 text-[10px] py-1 rounded-md border transition-colors ${
                      dueDate === localDate(offset)
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                        : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              className={`${fieldCls} resize-none`}
            />
          </div>

          <p className="text-[10px] text-zinc-600 text-center pt-1">
            Checklist, links &amp; tags can be added after saving
          </p>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 shrink-0 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || mutation.isPending}
            className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors"
          >
            {mutation.isPending ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </div>
    </>
  )
}
